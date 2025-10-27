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
  debugContinue,
  waitForSessionRunning,
  waitForTestResults,
  getNeotestOutput,
} from "../lib";
import { join } from "path";

const scenarioPath = join(import.meta.dir, "scenario");
const configPath = join(import.meta.dir, "..", "..", "init.lua");

const nvimTest = setupNvimTest(scenarioPath, configPath);
beforeEach(nvimTest.beforeEach);
afterEach(nvimTest.afterEach);

test("should debug test in helpers package and inspect variables", async () => {
  await openFile(nvimTest.client, "packages/helpers/src/tests/index.test.ts");
  await setCursorOnSearch(nvimTest.client, "should add two numbers");
  await setCursorOnSearch(nvimTest.client, "expect(result)");
  await toggleBreakpoint(nvimTest.client);

  const breakpoints = await listBreakpoints(nvimTest.client);
  expect(breakpoints.length).toBeGreaterThan(0);

  await setCursorOnSearch(nvimTest.client, "should add two numbers");
  await runTestUnderCursor(nvimTest.client);

  await waitForSessionInitialized(nvimTest.client, 10000);
  await waitForSessionStopped(nvimTest.client, 10000);

  const variables = await getVariablesInScope(nvimTest.client);
  const localVars = variables.Local || variables.Module || [];

  // Find and verify the variables a, b, and result
  const varA = localVars.find((v) => v.name === "a");
  const varB = localVars.find((v) => v.name === "b");
  const varResult = localVars.find((v) => v.name === "result");

  expect(varA).toBeDefined();
  expect(varA).toMatchObject({
    value: "2",
    type: "number",
  });

  expect(varB).toBeDefined();
  expect(varB).toMatchObject({
    value: "3",
    type: "number",
  });

  expect(varResult).toBeDefined();
  expect(varResult).toMatchObject({
    value: "5",
    type: "number",
  });

  await debugContinue(nvimTest.client);
  await waitForSessionRunning(nvimTest.client, 5000);
  await waitForTestResults(nvimTest.client);

  const output = await getNeotestOutput(nvimTest.client);

  expect(output).toMatchObject({
    failed: 0,
    passed: expect.any(Number),
  });
}, 10000);

test("should debug server app test with cross-package import", async () => {
  await openFile(nvimTest.client, "apps/server/src/tests/index.test.ts");
  await setCursorOnSearch(nvimTest.client, "should use add from helpers");
  await setCursorOnSearch(nvimTest.client, "expect(result)");
  await toggleBreakpoint(nvimTest.client);

  const breakpoints = await listBreakpoints(nvimTest.client);
  expect(breakpoints.length).toBeGreaterThan(0);

  await setCursorOnSearch(nvimTest.client, "should use add from helpers");
  await runTestUnderCursor(nvimTest.client);

  await waitForSessionInitialized(nvimTest.client, 10000);
  await waitForSessionStopped(nvimTest.client, 10000);

  const variables = await getVariablesInScope(nvimTest.client);
  const localVars = variables.Local || variables.Module || [];
  const resultVar = localVars.find((v) => v.name === "result");

  expect(resultVar).toBeDefined();
  expect(resultVar).toMatchObject({
    value: "15",
    type: "number",
  });

  await debugContinue(nvimTest.client);
  await waitForSessionRunning(nvimTest.client, 5000);
  await waitForTestResults(nvimTest.client);

  const output = await getNeotestOutput(nvimTest.client);

  expect(output).toMatchObject({
    failed: 0,
    passed: expect.any(Number),
  });
}, 10000);
