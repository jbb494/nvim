import { test, expect, afterEach, beforeEach } from "bun:test";
import {
  setupNvimTest,
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

const nvimTest = setupNvimTest(scenarioPath, configPath);
beforeEach(nvimTest.beforeEach);
afterEach(nvimTest.afterEach);

test("should set and retrieve a breakpoint in a file", async () => {
  // Open the math.ts file
  await openFile(nvimTest.client, "src/math.ts");

  // Position cursor on a specific line
  await setCursorOnSearch(nvimTest.client, "return a");

  // Get current line before setting breakpoint
  const beforeBPs = await listBreakpoints(nvimTest.client);
  const breakpointCountBefore = beforeBPs.length;

  // Set a breakpoint using dap API
  await toggleBreakpoint(nvimTest.client);
  expect(breakpointCountBefore).toEqual(0);

  // Check if breakpoints were actually added
  const afterBPs = await listBreakpoints(nvimTest.client);
  const breakpointCountAfter = afterBPs.length;

  expect(breakpointCountAfter).toEqual(1);
});

test("should be able to set breakpoints and query DAP state", async () => {
  // Open the debug-example.ts file which calls the multi-variable function
  await openFile(nvimTest.client, "src/main.ts");

  // Position cursor on the function call line
  await setCursorOnSearch(nvimTest.client, "# First breakpoint");

  // Set a breakpoint at the line where we can inspect all variables
  await toggleBreakpoint(nvimTest.client);

  // Verify breakpoint was set
  const breakpointsBefore = await listBreakpoints(nvimTest.client);
  expect(breakpointsBefore.length).toBeGreaterThan(0);

  // Start the debug session
  await startDebugSession(nvimTest.client);

  // Continue to breakpoint
  await continueDebugSession(nvimTest.client);

  // Get variables in current scope
  const variables = await getVariablesInScope(nvimTest.client);

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
  const breakpointsAfter = await listBreakpoints(nvimTest.client);
  expect(breakpointsAfter.length).toBeGreaterThan(0);
});
