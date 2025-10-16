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
 */
export async function startDebugSession(
  client: NeovimClient,
): Promise<ReturnType<typeof parse<typeof SessionStartResultSchema>>> {
  const result = await client.call("nvim_exec_lua", [
    `local dap = require('dap')
     local ok, err = pcall(function()
       dap.continue()
     end)
     return { success = ok, error = err }`,
    [],
  ]);

  return parse(SessionStartResultSchema, result);
}
