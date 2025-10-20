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

const SessionStartResultSchema = object({
  success: boolean(),
  error: optional(nullable(any())),
});

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
 * Start a debug session
 *
 * NOTE: In a headless Neovim environment, the DAP session may report success
 * but not actually be active due to the async nature of debug adapter protocol.
 * This is a known limitation when testing DAP in non-interactive environments.
 */
export async function startDebugSession(
  client: NeovimClient,
): Promise<ReturnType<typeof parse<typeof SessionStartResultSchema>>> {
  const result = await client.call("nvim_exec_lua", [
    `local dap = require('dap')
     local ok, err = pcall(function()
       -- Try to get the current configuration
       local configs = dap.configurations
       if not configs or not configs.typescript then
         error('No typescript configuration found')
       end

       -- Try to launch using the first available configuration
       dap.run(configs.typescript[1])
     end)
     return { success = ok, error = tostring(err) }`,
    [],
  ]);

  const parsed = parse(SessionStartResultSchema, result);

  // If session start was successful, wait for session to be fully initialized
  if (parsed.success) {
    // Wait for the debug adapter to initialize
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return parsed;
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
 * Get variable values from the current frame
 */
export async function getVariables(
  client: NeovimClient,
): Promise<Record<string, any>> {
  const result = await client.call("nvim_exec_lua", [
    `local dap = require('dap')
     local session = dap.session()
     if not session or not session.stopped_thread_id then
       return {}
     end

     local thread_id = session.stopped_thread_id
     local frame_id = session.frames[thread_id] and session.frames[thread_id][1]

     if not frame_id then
       return {}
     end

     local variables = {}

     if session.capabilities and session.capabilities.supportsVariables then
       local ok, scopes = pcall(function()
         return session:request('scopes', { frameId = frame_id })
       end)

       if ok and scopes then
         for _, scope in ipairs(scopes.scopes or {}) do
           if scope.variablesReference and scope.variablesReference > 0 then
             local ok, vars = pcall(function()
               return session:request('variables', { variablesReference = scope.variablesReference })
             end)

             if ok and vars then
               for _, var in ipairs(vars.variables or {}) do
                 variables[var.name] = var.value
               end
             end
           end
         end
       end
     end

     return variables`,
    [],
  ]);

  return result as Record<string, any>;
}

/**
 * Get debug session state with diagnostic information
 * Useful for debugging why variables aren't appearing
 */
export async function getSessionDebugInfo(
  client: NeovimClient,
): Promise<Record<string, any>> {
  const result = await client.call("nvim_exec_lua", [
    `local dap = require('dap')
     local session = dap.session()

     local info = {
       session_active = session ~= nil,
       stopped_thread_id = session and session.stopped_thread_id or nil,
       has_frames = session and session.frames ~= nil,
       capabilities_support_variables = session and session.capabilities and session.capabilities.supportsVariables or false,
     }

     if session and session.stopped_thread_id then
       info.thread_id = session.stopped_thread_id
       local frames = session.frames[session.stopped_thread_id]
       info.num_frames = frames and #frames or 0

       if frames and frames[1] then
         local frame = frames[1]
         info.first_frame_id = frame.id
         info.first_frame_name = frame.name
         info.first_frame_source = frame.source and frame.source.path or nil

         -- Try to get scopes
         local ok, scopes = pcall(function()
           return session:request('scopes', { frameId = frame.id })
         end)

         if ok and scopes then
           info.num_scopes = #(scopes.scopes or {})
           info.scopes_detail = {}
           for _, scope in ipairs(scopes.scopes or {}) do
             table.insert(info.scopes_detail, {
               name = scope.name,
               variablesReference = scope.variablesReference,
               indexed = scope.indexed,
               named = scope.named
             })

             -- Try to get variables for first scope
             if scope.variablesReference and scope.variablesReference > 0 then
               local ok2, vars = pcall(function()
                 return session:request('variables', { variablesReference = scope.variablesReference })
               end)

               if ok2 and vars then
                 info.num_variables_in_first_scope = #(vars.variables or {})
               end
             end
           end
         end
       end
     end

     return info`,
    [],
  ]);

  return result as Record<string, any>;
}

/**
 * Get the current frame location
 */
export async function getCurrentFrameLocation(
  client: NeovimClient,
): Promise<{ file: string; line: number } | null> {
  const result = await client.call("nvim_exec_lua", [
    `local dap = require('dap')
     local session = dap.session()
     if not session or not session.stopped_thread_id then
       return nil
     end

     local thread_id = session.stopped_thread_id
     local frame = session.frames[thread_id] and session.frames[thread_id][1]

     if not frame or not frame.source or not frame.source.path then
       return nil
     end

     return {
       file = frame.source.path,
       line = frame.line
     }`,
    [],
  ]);

  return result as { file: string; line: number } | null;
}

/**
 * Continue execution
 */
export async function continueExecution(client: NeovimClient): Promise<void> {
  await client.call("nvim_exec_lua", [
    `require('dap').continue()`,
    [],
  ]);
}

/**
 * Stop the debug session
 */
export async function stopDebugSession(client: NeovimClient): Promise<void> {
  await client.call("nvim_exec_lua", [
    `local dap = require('dap')
     if dap.session() then
       dap.terminate()
     end`,
    [],
  ]);
}
