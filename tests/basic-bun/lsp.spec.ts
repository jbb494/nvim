import { test, expect, beforeAll, afterAll } from "bun:test";
import { NeovimClient } from "../lib/nvim";
import { openFile, getFileName } from "../lib/lsp";
import { join } from "path";

const scenarioPath = join(import.meta.dir, "scenario");
const port = 6666;

let client: NeovimClient;

beforeAll(async () => {
  client = new NeovimClient(port);
  await client.start(scenarioPath);

  // Wait a bit for LSP to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
}, { timeout: 30000 });

afterAll(async () => {
  await client.close();
});

test("should connect to neovim", async () => {
  // Just verify the connection is working by calling a simple command
  const result = await client.call("nvim_eval", ["1 + 1"]);
  expect(result).toBe(2);
}, { timeout: 30000 });

test("should open a file", async () => {
  // Open the main.ts file
  await openFile(client, "main.ts");

  // Wait for file to be opened
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Try to get the current file
  const fileName = await getFileName(client);
  expect(fileName).toContain("main.ts");
}, { timeout: 30000 });
