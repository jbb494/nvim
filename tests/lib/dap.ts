import {
  object,
  string,
  array,
  record,
  any,
  parse,
  nullable,
  optional,
  number,
  unknown,
} from "valibot";
import { NeovimClient } from "./nvim";
import { sendKeys } from "./cursor";

const BreakpointSchema = object({
  line: any(),
  condition: optional(nullable(string())),
  hitCondition: optional(nullable(string())),
  logMessage: optional(nullable(string())),
  state: optional(nullable(any())),
});

const BreakpointsByBufferSchema = record(string(), array(BreakpointSchema));

const DAPVariableSchema = object({
  name: string(),
  value: string(),
  type: optional(string()),
  evaluateName: optional(string()),
  variablesReference: number(),
  presentationHint: optional(unknown()),
});

const VariablesByScopeSchema = record(string(), array(DAPVariableSchema));

// ============================================================================
// LAYER 1: State Readers (Query current state)
// ============================================================================

/**
 * Get breakpoints grouped by buffer (internal helper)
 * Returns a table of breakpoints: { [bufnr] = [breakpoints...] }
 */
async function getBreakpoints(
  client: NeovimClient,
  bufexpr?: number,
): Promise<ReturnType<typeof parse<typeof BreakpointsByBufferSchema>>> {
  const bufArg = bufexpr !== undefined ? bufexpr : "nil";
  const result = await client.call("nvim_exec_lua", [
    `return require('dap.breakpoints').get(${bufArg})`,
    [],
  ]);

  return parse(BreakpointsByBufferSchema, result);
}

/**
 * Get all breakpoints flattened into a single array
 */
export async function listBreakpoints(
  client: NeovimClient,
): Promise<ReturnType<typeof parse<typeof BreakpointSchema>>[]> {
  const breakpointsByBuffer = await getBreakpoints(client);
  const allBreakpoints: ReturnType<typeof parse<typeof BreakpointSchema>>[] =
    [];

  for (const bufBreakpoints of Object.values(breakpointsByBuffer)) {
    allBreakpoints.push(...bufBreakpoints);
  }

  return allBreakpoints;
}

/**
 * Get variables in current scope
 * Returns variables grouped by scope name (e.g., "Module", "Local", etc.)
 */
export async function getVariablesInScope(
  client: NeovimClient,
): Promise<ReturnType<typeof parse<typeof VariablesByScopeSchema>>> {
  const result = await client.call("nvim_exec_lua", [
    `
local dap = require('dap')
local session = assert(dap.session(), "has active session")
assert(session.stopped_thread_id, "Session must be stopped")

-- Step 1: Get stack trace for the stopped thread
local stacktrace_response = nil
local stacktrace_finished = false

session:request("stackTrace", { threadId = session.stopped_thread_id, startFrame = 0 }, function(err, result)
  if err then
    stacktrace_response = { err = err }
  else
    stacktrace_response = { result = result }
  end
  stacktrace_finished = true
end)

local stacktrace_success = vim.wait(5000, function()
  return stacktrace_finished
end, 10)

assert(stacktrace_success, "StackTrace request timed out")
assert(not stacktrace_response.err, "StackTrace request failed: " .. vim.inspect(stacktrace_response.err))

local frames = stacktrace_response.result.stackFrames
assert(frames and #frames > 0, "No stack frames available")
local current_frame = frames[1]

-- Step 2: Get scopes for current frame
local scopes_response = nil
local scopes_finished = false

session:request("scopes", { frameId = current_frame.id }, function(err, result)
  if err then
    scopes_response = { err = err }
  else
    scopes_response = { result = result }
  end
  scopes_finished = true
end)

local scopes_success = vim.wait(5000, function()
  return scopes_finished
end, 10)

assert(scopes_success, "Scopes request timed out")
assert(not scopes_response.err, "Scopes request failed: " .. vim.inspect(scopes_response.err))

local scopes = scopes_response.result.scopes

-- Step 3: Get variables for each non-expensive scope
local all_variables = {}

for _, scope in ipairs(scopes) do
  if not scope.expensive then  -- Skip expensive scopes like "Global"
    local vars_response = nil
    local vars_finished = false
    
    session:request("variables", { variablesReference = scope.variablesReference }, function(err, result)
      if err then
        vars_response = { err = err }
      else
        vars_response = { result = result }
      end
      vars_finished = true
    end)
    
    local vars_success = vim.wait(5000, function()
      return vars_finished
    end, 10)
    
    assert(vars_success, "Variables request timed out for scope: " .. scope.name)
    assert(not vars_response.err, "Variables request failed for scope " .. scope.name .. ": " .. vim.inspect(vars_response.err))
    
    all_variables[scope.name] = vars_response.result.variables
  end
end

return all_variables
`,
    [],
  ]);

  return parse(VariablesByScopeSchema, result);
}

// ============================================================================
// LAYER 2: Waiters (Poll until condition is met)
// ============================================================================

/**
 * Wait for debug session to initialize
 */
export async function waitForSessionInitialized(
  client: NeovimClient,
  timeoutMs: number = 10000,
): Promise<void> {
  await client.call(
    "nvim_exec_lua",
    [
      `
local dap = require('dap')

rpc_print("[LUA] Waiting for session to initialize...")

local initialized = vim.wait(${timeoutMs}, function()
  local session = dap.session()
  return session ~= nil and session.initialized == true
end, 100)

assert(initialized, "Session failed to initialize within ${timeoutMs}ms")
rpc_print("[LUA] Session initialized")
`,
      [],
    ],
    timeoutMs + 1000,
  );
}

/**
 * Wait for debugger to stop (at breakpoint or entry point)
 */
export async function waitForSessionStopped(
  client: NeovimClient,
  timeoutMs: number = 10000,
): Promise<void> {
  await client.call(
    "nvim_exec_lua",
    [
      `
local dap = require('dap')

rpc_print("[LUA] Waiting for debugger to stop...")

local stopped = vim.wait(${timeoutMs}, function()
  local session = dap.session()
  return session and session.stopped_thread_id ~= nil
end, 100)

assert(stopped, "Debugger did not stop within ${timeoutMs}ms")

local session = dap.session()
rpc_print("[LUA] Debugger stopped at thread: " .. tostring(session.stopped_thread_id))
`,
      [],
    ],
    timeoutMs + 1000,
  );
}

/**
 * Wait for debugger to start running (stopped_thread_id becomes nil)
 * Internal helper used by continueDebugSession
 */
export async function waitForSessionRunning(
  client: NeovimClient,
  timeoutMs: number = 5000,
): Promise<void> {
  await client.call(
    "nvim_exec_lua",
    [
      `
local dap = require('dap')

rpc_print("[LUA] Waiting for debugger to start running...")

local is_running = vim.wait(${timeoutMs}, function()
  local current_session = dap.session()
  if not current_session then
    return false
  end
  return current_session.stopped_thread_id == nil
end, 100)

assert(is_running, "Debugger did not start running within ${timeoutMs}ms")
rpc_print("[LUA] Debugger is now running")
`,
      [],
    ],
    timeoutMs + 1000,
  );
}

// ============================================================================
// LAYER 3: Actions (Perform operations)
// ============================================================================

/**
 * Toggle a breakpoint at the current cursor position
 * Uses <leader>b keymap
 */
export async function toggleBreakpoint(client: NeovimClient): Promise<void> {
  await sendKeys(client, "<leader>b");
}

/**
 * Start/continue debug session by sending <leader>dc
 * Internal helper used by startDebugSession and continueDebugSession
 */
export async function debugContinue(client: NeovimClient): Promise<void> {
  await sendKeys(client, "<leader>dc");
}

// ============================================================================
// LAYER 4: Composite Actions (Convenience functions combining action + wait)
// ============================================================================

/**
 * Start a debug session and wait for it to initialize and stop at entry point
 * This is a convenience function that combines debugContinue + waiters
 */
export async function startDebugSession(client: NeovimClient): Promise<void> {
  await debugContinue(client);
  await waitForSessionInitialized(client, 5000);
  await waitForSessionStopped(client, 5000);
}
