import { test, expect, afterEach, beforeEach } from "bun:test";
import {
  NeovimClient,
  openFile,
  getFileName,
  requestHover,
  setCursorPosition,
  waitForLsp,
} from "../lib";
import { join } from "path";

const scenarioPath = join(import.meta.dir, "scenario");
const configPath = join(import.meta.dir, "..", "..", "init.lua");
const port = 6666;

let client: NeovimClient;

beforeEach(async () => {
  client = new NeovimClient(port);
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

test("should open a file", async () => {
  // Open the main.ts file
  await openFile(client, "main.ts");

  // Try to get the current file
  const fileName = await getFileName(client);
  expect(fileName).toContain("main.ts");
});

test("should request hover information", async () => {
  // Open the main.ts file
  await openFile(client, "main.ts");
  await waitForLsp(client);

  await setCursorPosition(client, 0, 6);
  // Request hover information
  const hover = await requestHover(client);

  // Hover should return the word under cursor
  expect(hover).toBe("```typescript\nconst greeting: string\n```");
});
