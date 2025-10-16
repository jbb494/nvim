import {
  object,
  number,
  array,
  string,
  parse,
  nullable,
} from "valibot";
import { NeovimClient } from "./nvim";

const StatusCountsSchema = object({
  total: number(),
  passed: number(),
  failed: number(),
  skipped: number(),
  running: number(),
});

/**
 * Run the test under the cursor
 * Simulates pressing <leader>t in Neovim to run the test at cursor position
 */
export async function runTestUnderCursor(client: NeovimClient) {
  await client.call("nvim_exec_lua", [`require('neotest').run.run()`, []]);
}

/**
 * Wait for test results to complete
 * Polls neotest state until tests are done or timeout is reached
 */
export async function waitForTestResults(
  client: NeovimClient,
  timeoutMs = 10000,
) {
  const startTime = Date.now();
  let testsStarted = false;

  while (Date.now() - startTime < timeoutMs) {
    const adapterIds = await client.call("nvim_exec_lua", [
      `return require('neotest').state.adapter_ids()`,
      [],
    ]);

    const AdapterIdsSchema = array(string());
    const parsedAdapterIds = parse(AdapterIdsSchema, adapterIds);

    if (!parsedAdapterIds || parsedAdapterIds.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }

    const adapterId = parsedAdapterIds[0];
    const statusCounts = await client.call("nvim_exec_lua", [
      `return require('neotest').state.status_counts('${adapterId}')`,
      [],
    ]);

    const parsed = parse(nullable(StatusCountsSchema), statusCounts);

    // Wait until tests have been discovered (total > 0) before checking for completion
    if (!testsStarted) {
      if (parsed && parsed.total > 0) {
        testsStarted = true;
      } else {
        // Tests haven't been discovered yet, keep waiting
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }
    }

    // If tests have started and no tests are running, they've completed
    if (parsed && parsed.running === 0 && testsStarted) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `Waiting for tests results did not complete within ${timeoutMs}ms`,
  );
}

/**
 * Get the neotest output/results
 * Returns test status counts from the last run
 */
export async function getNeotestOutput(client: NeovimClient) {
  const adapterIds = await client.call("nvim_exec_lua", [
    `return require('neotest').state.adapter_ids()`,
    [],
  ]);

  const AdapterIdsSchema = array(string());
  const parsedAdapterIds = parse(AdapterIdsSchema, adapterIds);

  if (!parsedAdapterIds || parsedAdapterIds.length === 0) {
    return null;
  }

  const adapterId = parsedAdapterIds[0];
  const statusCounts = await client.call("nvim_exec_lua", [
    `return require('neotest').state.status_counts('${adapterId}')`,
    [],
  ]);

  return parse(nullable(StatusCountsSchema), statusCounts);
}
