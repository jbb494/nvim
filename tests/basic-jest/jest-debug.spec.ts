import { test, expect, afterEach, beforeEach } from "bun:test";
import {
  setupNvimTest,
  openFile,
  setCursorOnSearch,
  toggleBreakpoint,
  runTestUnderCursor,
  getVariablesInScope,
  listBreakpoints,
  waitForSessionInitialized,
  waitForSessionStopped,
} from "../lib";
import { join } from "path";

const scenarioPath = join(import.meta.dir, "scenario");
const configPath = join(import.meta.dir, "..", "..", "init.lua");

const nvimTest = setupNvimTest(scenarioPath, configPath);
beforeEach(nvimTest.beforeEach);
afterEach(nvimTest.afterEach);

test("should debug a test and inspect variables at breakpoint", async () => {
  // Open the test file
  await openFile(nvimTest.client, "src/math.test.ts");

  // Position cursor on the test we want to debug
  await setCursorOnSearch(nvimTest.client, "should add two positive numbers");
  
  // Move to the expect line where a and b are in scope
  await setCursorOnSearch(nvimTest.client, "expect(add(a, b))");

  // Set a breakpoint at this line
  await toggleBreakpoint(nvimTest.client);

  // Verify breakpoint was set
  const breakpoints = await listBreakpoints(nvimTest.client);
  expect(breakpoints.length).toBeGreaterThan(0);

  // Position cursor on the test name so we run the right test
  await setCursorOnSearch(nvimTest.client, "should add two positive numbers");

  // Run the test (will use dap strategy because breakpoint exists)
  await runTestUnderCursor(nvimTest.client);

  // Wait for debug session to initialize and stop at breakpoint
  await waitForSessionInitialized(nvimTest.client, 10000);
  await waitForSessionStopped(nvimTest.client, 10000);

  // Get variables in current scope
  const variables = await getVariablesInScope(nvimTest.client);

  // Verify we can access variables a and b from the test
  const localVars = variables.Local || variables.Module || [];
  
  const varA = localVars.find((v) => v.name === "a");
  const varB = localVars.find((v) => v.name === "b");

  expect(varA).toBeDefined();
  expect(varB).toBeDefined();

  expect(varA).toMatchObject({
    value: "2",
    type: "number",
  });

  expect(varB).toMatchObject({
    value: "3",
    type: "number",
  });
});
