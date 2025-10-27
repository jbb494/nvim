import { test, expect, afterEach, beforeEach } from "bun:test";
import {
  setupNvimTest,
  runTestUnderCursor,
  waitForTestResults,
  setCursorOnSearch,
  openFile,
  getNeotestOutput,
} from "../lib";
import { join } from "path";

const scenarioPath = join(import.meta.dir, "scenario");
const configPath = join(import.meta.dir, "..", "..", "init.lua");

const nvimTest = setupNvimTest(scenarioPath, configPath);
beforeEach(nvimTest.beforeEach);
afterEach(nvimTest.afterEach);

test("should run test under cursor in package (helpers)", async () => {
  // Open the helpers package test file
  await openFile(nvimTest.client, "packages/helpers/src/tests/index.test.ts");

  // Position cursor on a test
  await setCursorOnSearch(nvimTest.client, "should add two numbers");

  // Run the test under cursor
  await runTestUnderCursor(nvimTest.client);

  // Wait for tests to complete
  await waitForTestResults(nvimTest.client);

  // Get test output
  const output = await getNeotestOutput(nvimTest.client);

  // Assert that output shows tests ran successfully
  expect(output).toMatchObject({
    failed: 0,
    passed: expect.any(Number),
    total: 6, // Total tests in monorepo
  });
});

test("should run test under cursor in app (server)", async () => {
  // Open the server app test file
  await openFile(nvimTest.client, "apps/server/src/tests/index.test.ts");

  // Position cursor on a test
  await setCursorOnSearch(nvimTest.client, "should use add from helpers");

  // Run the test under cursor
  await runTestUnderCursor(nvimTest.client);

  // Wait for tests to complete
  await waitForTestResults(nvimTest.client);

  // Get test output
  const output = await getNeotestOutput(nvimTest.client);

  // Assert that output shows tests ran successfully
  expect(output).toMatchObject({
    failed: 0,
    passed: expect.any(Number),
    total: 6, // Total tests in monorepo
  });
});
