import {
  object,
  boolean,
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

const BreakpointSchema = object({
  line: any(),
  condition: optional(nullable(string())),
  hitCondition: optional(nullable(string())),
  logMessage: optional(nullable(string())),
  state: optional(nullable(any())),
});

const BreakpointsByBufferSchema = record(string(), array(BreakpointSchema));

const AdapterConfigSchema = object({
  type: string(),
  host: optional(string()),
  port: optional(string()),
  has_executable: optional(boolean()),
});

const DAPVariableSchema = object({
  name: string(),
  value: string(),
  type: optional(string()),
  evaluateName: optional(string()),
  variablesReference: number(),
  presentationHint: optional(unknown()),
});

const VariablesByScopeSchema = record(string(), array(DAPVariableSchema));

/**
 * Get breakpoints grouped by buffer
 * Returns a table of breakpoints: { [bufnr] = [breakpoints...] }
 */
export async function getBreakpoints(
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
 * Toggle a breakpoint at the current cursor position
 */
export async function toggleBreakpoint(client: NeovimClient): Promise<void> {
  await client.call("nvim_exec_lua", [
    `require('dap').toggle_breakpoint()`,
    [],
  ]);
}

/**
 * Set a breakpoint at the current cursor position
 */
export async function setBreakpoint(client: NeovimClient): Promise<void> {
  await client.call("nvim_exec_lua", [`require('dap').set_breakpoint()`, []]);
}

/**
 * Get adapter configuration details
 */
export async function getAdapterDetails(
  client: NeovimClient,
  adapterName: string,
): Promise<ReturnType<typeof parse<typeof AdapterConfigSchema>>> {
  const result = await client.call("nvim_exec_lua", [
    `local dap = require('dap')
     local adapter = dap.adapters['${adapterName}']
     if not adapter then return nil end
     return {
       type = adapter.type,
       host = adapter.host,
       has_executable = adapter.executable ~= nil,
       port = adapter.port
     }`,
    [],
  ]);

  return parse(AdapterConfigSchema, result);
}

/**
 * Start a debug session and wait for it to initialize
 */
export async function startDebugSession(client: NeovimClient): Promise<void> {
  await client.call(
    "nvim_exec_lua",
    [
      `
local dap = require('dap')

rpc_print("[LUA] Starting debug session with dap.continue()")
dap.continue()

rpc_print("[LUA] Waiting for session to initialize...")

local initialized = vim.wait(5000, function()
  local session = dap.session()
  return session.initialized == true
end, 10)
assert(initialized, "Session failed to initialize within 5 seconds")
rpc_print("[LUA] Session initialized")

rpc_print("[LUA] Waiting for debugger to stop at entry point...")
local stopped = vim.wait(5000, function()
  local session = dap.session()
  assert(session, "has active session")
  -- rpc_print("[LUA] thread: " .. tostring(session.stopped_thread_id))
  return session.stopped_thread_id ~= nil
end, 10)
assert(stopped, "Debugger did not stop within 5 seconds")

local session = dap.session()
assert(session, "has active session")
rpc_print("[LUA] Stopped at entry point, thread: " .. tostring(session.stopped_thread_id))
`,
      [],
    ],
    null,
  );
}

/**
 * Continue execution until the debugger stops at a breakpoint
 */
export async function continueDebugSession(
  client: NeovimClient,
): Promise<void> {
  await client.call(
    "nvim_exec_lua",
    [
      `
local dap = require('dap')
local session = assert(dap.session(), "has active session")

-- Ensure debugger is already stopped before we call continue
assert(session.stopped_thread_id ~= nil, "Session is not stopped, cannot continue")
rpc_print("[LUA] Debugger is stopped at thread: " .. tostring(session.stopped_thread_id))

rpc_print("[LUA] Calling dap.continue()")
dap.continue()

-- Phase 1: Wait for the debugger to start running (stopped_thread_id becomes nil)
rpc_print("[LUA] Phase 1: Waiting for debugger to start running...")
local is_running = vim.wait(5000, function()
  local current_session = dap.session()
  if not current_session then
    return false
  end
  return current_session.stopped_thread_id == nil
end, 10)
assert(is_running, "Debugger did not start running within 5 seconds")
rpc_print("[LUA] Debugger is now running")

-- Phase 2: Wait for the debugger to stop again (stopped_thread_id becomes non-nil)
rpc_print("[LUA] Phase 2: Waiting for debugger to stop at breakpoint...")
local stopped = vim.wait(5000, function()
  local current_session = dap.session()
  if not current_session then
    return false
  end
  return current_session.stopped_thread_id ~= nil
end, 10)

assert(stopped, "Debugger did not stop within 5 seconds")
local final_session = dap.session()
assert(final_session, "has active session")
rpc_print("[LUA] Debugger stopped at thread: " .. tostring(final_session.stopped_thread_id))
`,
      [],
    ],
    null,
  );
}

/**
 * Get the current debug session state
 */
export async function getSessionState(
  client: NeovimClient,
): Promise<{ active: boolean; stopped: boolean }> {
  const result = await client.call("nvim_exec_lua", [
    `local dap = require('dap')
     return {
       active = dap.session() ~= nil,
       stopped = dap.session() ~= nil and dap.session().stopped_thread_id ~= nil
     }`,
    [],
  ]);

  return result as { active: boolean; stopped: boolean };
}

/**
 * Wait for debugger to stop at breakpoint
 */
export async function waitForBreakpoint(
  client: NeovimClient,
  timeoutMs: number = 5000,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const state = await getSessionState(client);
      if (state.stopped) {
        return true;
      }
    } catch (error) {
      // Session might not be ready yet, continue waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return false;
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
