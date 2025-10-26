# Testing Neovim Dotfiles

## Example Tests
Read these to understand how tests work:
- `tests/basic-bun/lsp.spec.ts` - LSP testing example
- `tests/basic-jest/jest.spec.ts` - Jest framework example

## Available Test Utilities
Located in `tests/lib/`:
- `nvim.ts` - NeovimClient for communicating with Neovim
- `lsp.ts` - LSP-related helpers
- `cursor.ts` - Cursor position and keypress helpers (including `sendKeys`)
- `jest.ts` - Neotest integration helpers
- `dap.ts` - DAP (debugger) helpers with composable functions:

## Writing Tests

Use `setupNvimTest()` to handle test lifecycle with automatic DEBUG_NVIM support:

```typescript
import { setupNvimTest, openFile } from "../lib";

const nvimTest = setupNvimTest(scenarioPath, configPath);
beforeEach(nvimTest.beforeEach);
afterEach(nvimTest.afterEach);

test("something", async () => {
  await openFile(nvimTest.client, "file.ts");
  // ...
});
```

## Finding Documentation

**Neovim native commands:**
```sh
nvim -es +'help [topic]' +'w! /dev/stdout' +'q!'
```
Example: `nvim -es +'help nvim_exec_lua' +'w! /dev/stdout' +'q!'`

**Plugin documentation:**
```
~/.local/share/nvim/lazy/[plugin-name]/
```
Example: `~/.local/share/nvim/lazy/neotest/` for Neotest docs

## Running Tests
```sh
cd tests/
bun test ./**/*.spec.ts
```

## Running all tests
```sh
cd tests/
bun run test
```

### Debug Logs
To see debug logs from the RPC communication, set `LOG_LEVEL=DEBUG` before running tests:

```sh
LOG_LEVEL=DEBUG bun test
```

This will show console.debug output including Neovim RPC messages like `[Neovim RPC]: [LUA] ...`
