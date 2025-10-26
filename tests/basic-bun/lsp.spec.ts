import { test, expect, afterEach, beforeEach } from "bun:test";
import {
  setupNvimTest,
  openFile,
  getFileName,
  requestHover,
  setCursorPosition,
  waitForLsp,
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

test("should open a file", async () => {
  // Open the main.ts file
  await openFile(nvimTest.client, "main.ts");

  // Try to get the current file
  const fileName = await getFileName(nvimTest.client);
  expect(fileName).toContain("main.ts");
});

test("should request hover information", async () => {
  // Open the main.ts file
  await openFile(nvimTest.client, "main.ts");
  await waitForLsp(nvimTest.client);

  await setCursorPosition(nvimTest.client, 0, 6);
  // Request hover information
  const hover = await requestHover(nvimTest.client);

  // Hover should return the word under cursor
  expect(hover).toBe("```typescript\nconst greeting: string\n```");
});
