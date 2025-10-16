import { test, expect, afterEach, beforeEach } from "bun:test";
import {
  NeovimClient,
  openFile,
  setCursorOnSearch,
  listBreakpoints,
  toggleBreakpoint,
  getAdapterDetails,
  startDebugSession,
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

test("should set and retrieve a breakpoint in a file", async () => {
  // Open the math.ts file
  await openFile(client, "src/math.ts");

  // Position cursor on a specific line
  await setCursorOnSearch(client, "return a");

  // Get current line before setting breakpoint
  const beforeBPs = await listBreakpoints(client);
  const breakpointCountBefore = beforeBPs.length;

  // Set a breakpoint using dap API
  await toggleBreakpoint(client);
  expect(breakpointCountBefore).toEqual(0);

  // Check if breakpoints were actually added
  const afterBPs = await listBreakpoints(client);
  const breakpointCountAfter = afterBPs.length;

  expect(breakpointCountAfter).toEqual(1);
});

test("should be able to start debugging session", async () => {
  // Open a file to debug
  await openFile(client, "src/math.ts");

  // Try to start a debug session - this should work or explicitly fail
  const sessionStartResult = await startDebugSession(client);

  expect(sessionStartResult.success).toBeTrue();
});
