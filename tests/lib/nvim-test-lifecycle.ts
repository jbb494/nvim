import { NeovimClient } from "./nvim";

/**
 * Setup Neovim test lifecycle with automatic DEBUG_NVIM support
 * 
 * Usage:
 * ```typescript
 * const nvimTest = setupNvimTest(scenarioPath, configPath);
 * beforeEach(nvimTest.beforeEach);
 * afterEach(nvimTest.afterEach);
 * 
 * test("something", async () => {
 *   await openFile(nvimTest.client, "file.ts");
 * });
 * ```
 */
export function setupNvimTest(scenarioPath: string, configPath: string) {
  let client: NeovimClient;

  const hooks = {
    beforeEach: async () => {
      client = new NeovimClient();
      await client.start(scenarioPath, configPath);

      if (process.env.DEBUG_NVIM) {
        await client.waitForUiClient();
      }
    },
    afterEach: async () => {
      if (process.env.DEBUG_NVIM) {
        await client.waitForUiDisconnect();
      }

      await client.close();
    },
    get client() {
      return client;
    },
  };

  return hooks;
}
