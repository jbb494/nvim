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

test("should connect to neovim", async () => {
  // Just verify the connection is working by calling a simple command
  const result = await nvimTest.client.call("nvim_eval", ["1 + 1"]);
  expect(result).toBe(2);
});

test("should run test under cursor", async () => {
  // Open the test file
  await openFile(nvimTest.client, "src/math.test.ts");

  // Position cursor on a test
  await setCursorOnSearch(nvimTest.client, "should add");

  // Run the test under cursor (simulates pressing <leader>t)
  await runTestUnderCursor(nvimTest.client);

  // Wait for tests to complete
  await waitForTestResults(nvimTest.client);

  // Get test output
  const output = await getNeotestOutput(nvimTest.client);

  // Assert that output is a valid object with expected structure
  expect(output).toEqual({
    failed: 0,
    passed: 1,
    running: 0,
    skipped: 10,
    total: 11,
  });
});
