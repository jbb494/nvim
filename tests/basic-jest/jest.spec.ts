import { test, expect, afterEach, beforeEach } from "bun:test";
import {
  NeovimClient,
  runTestUnderCursor,
  waitForTestResults,
  setCursorOnSearch,
  openFile,
  getNeotestOutput,
} from "../lib";
import { join } from "path";

const scenarioPath = join(import.meta.dir, "scenario");
const configPath = join(import.meta.dir, "..", "..", "init.lua");

let client: NeovimClient;

beforeEach(async () => {
  client = new NeovimClient();
  await client.start(scenarioPath, configPath);
});

afterEach(async () => {
  await client.close();
});

test("should connect to neovim", async () => {
  // Just verify the connection is working by calling a simple command
  const result = await client.call("nvim_eval", ["1 + 1"]);
  expect(result).toBe(2);
});

test("should run test under cursor", async () => {
  // Open the test file
  await openFile(client, "src/math.test.ts");

  // Position cursor on a test
  await setCursorOnSearch(client, "should add");

  // Run the test under cursor (simulates pressing <leader>t)
  await runTestUnderCursor(client);

  // Wait for tests to complete
  await waitForTestResults(client);

  // Get test output
  const output = await getNeotestOutput(client);

  // Assert that output is a valid object with expected structure
  expect(output).toEqual({
    failed: 0,
    passed: 1,
    running: 0,
    skipped: 10,
    total: 11,
  });
});
