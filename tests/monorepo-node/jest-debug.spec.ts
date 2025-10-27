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

test("should debug test in helpers package and inspect variables", async () => {
  // Open the helpers package test file
  await openFile(nvimTest.client, "packages/helpers/src/tests/index.test.ts");

  // Position cursor on the test we want to debug
  await setCursorOnSearch(nvimTest.client, "should add two numbers");

  // Move to the expect line where we can inspect variables
  await setCursorOnSearch(nvimTest.client, "expect(add(2, 3))");

  // Set a breakpoint at this line
  await toggleBreakpoint(nvimTest.client);

  // Verify breakpoint was set
  const breakpoints = await listBreakpoints(nvimTest.client);
  expect(breakpoints.length).toBeGreaterThan(0);

  // Position cursor on the test name so we run the right test
  await setCursorOnSearch(nvimTest.client, "should add two numbers");

  // Run the test (will use dap strategy because breakpoint exists)
  await runTestUnderCursor(nvimTest.client);

  // Wait for debug session to initialize and stop at breakpoint
  await waitForSessionInitialized(nvimTest.client, 10000);
  await waitForSessionStopped(nvimTest.client, 10000);

  // Get variables in current scope
  const variables = await getVariablesInScope(nvimTest.client);

  // Verify we can access the function result or parameters
  const localVars = variables.Local || variables.Module || [];

  // In monorepo context, we should be able to inspect the add function call
  expect(localVars.length).toBeGreaterThan(0);
});

test("should debug server app test with cross-package import", async () => {
  // Open the server app test file
  await openFile(nvimTest.client, "apps/server/src/tests/index.test.ts");

  // Position cursor on the test we want to debug
  await setCursorOnSearch(nvimTest.client, "should use add from helpers");

  // Move to the line where result is assigned
  await setCursorOnSearch(nvimTest.client, "const result = add(10, 5)");

  // Set a breakpoint at this line
  await toggleBreakpoint(nvimTest.client);

  // Verify breakpoint was set
  const breakpoints = await listBreakpoints(nvimTest.client);
  expect(breakpoints.length).toBeGreaterThan(0);

  // Position cursor on the test name so we run the right test
  await setCursorOnSearch(nvimTest.client, "should use add from helpers");

  // Run the test (will use dap strategy because breakpoint exists)
  await runTestUnderCursor(nvimTest.client);

  // Wait for debug session to initialize and stop at breakpoint
  await waitForSessionInitialized(nvimTest.client, 10000);
  await waitForSessionStopped(nvimTest.client, 10000);

  // Get variables in current scope
  const variables = await getVariablesInScope(nvimTest.client);

  // Verify we can access variables in the cross-package test
  const localVars = variables.Local || variables.Module || [];

  // We might be able to see the result variable or parameters
  expect(localVars.length).toBeGreaterThan(0);
});
