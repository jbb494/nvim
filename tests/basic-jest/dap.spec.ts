import { test, expect, afterEach, beforeEach } from "bun:test";
import {
  NeovimClient,
  openFile,
  setCursorOnSearch,
  listBreakpoints,
  toggleBreakpoint,
  startDebugSession,
  continueDebugSession,
  getVariablesInScope,
} from "../lib";
import { join } from "path";

const scenarioPath = join(import.meta.dir, "scenario");
const configPath = join(import.meta.dir, "..", "..", "init.lua");

let client: NeovimClient;

beforeEach(async () => {
  client = new NeovimClient();
  await client.start(scenarioPath, configPath);

  if (process.env.DEBUG_NVIM) {
    await client.waitForUiClient();
  }
});

afterEach(async () => {
  if (process.env.DEBUG_NVIM) {
    await client.waitForUiDisconnect();
  }

  await client.close();
});

test("should set and retrieve a breakpoint in a file", async () => {
  // Open the math.ts file
  await openFile(client, "src/math.ts");

  // Position cursor on a specific line
  await setCursorOnSearch(client, "return a");

  // Get current line before setting breakpoint
  const beforeBPs = await listBreakpoints(client);
  const breakpointCountBefore = beforeBPs.length;

  // Set a breakpoint using dap API
  await toggleBreakpoint(client);
  expect(breakpointCountBefore).toEqual(0);

  // Check if breakpoints were actually added
  const afterBPs = await listBreakpoints(client);
  const breakpointCountAfter = afterBPs.length;

  expect(breakpointCountAfter).toEqual(1);
});

test("should be able to set breakpoints and query DAP state", async () => {
  // Open the debug-example.ts file which calls the multi-variable function
  await openFile(client, "src/main.ts");

  // Position cursor on the function call line
  await setCursorOnSearch(client, "# First breakpoint");

  // Set a breakpoint at the line where we can inspect all variables
  await toggleBreakpoint(client);

  // Verify breakpoint was set
  const breakpointsBefore = await listBreakpoints(client);
  expect(breakpointsBefore.length).toBeGreaterThan(0);
  console.debug("Breakpoints set:", breakpointsBefore.length);

  // Start the debug session
  await startDebugSession(client);

  // Continue to breakpoint
  await continueDebugSession(client);

  // Get variables in current scope
  const variables = await getVariablesInScope(client);
  console.debug("Variables in scope:", JSON.stringify(variables, null, 2));

  // Verify we can access variables a and b from main.ts
  const moduleVars = variables.Module;
  if (!moduleVars) {
    throw new Error("Module scope not found");
  }

  const varA = moduleVars.find((v) => v.name === "a");
  const varB = moduleVars.find((v) => v.name === "b");

  expect(varA).toMatchObject({
    value: "5",
    type: "number",
  });

  expect(varB).toMatchObject({
    value: "4",
    type: "number",
  });

  // Verify we still have the breakpoint
  const breakpointsAfter = await listBreakpoints(client);
  expect(breakpointsAfter.length).toBeGreaterThan(0);
});
