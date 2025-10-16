# Testing Neovim Dotfiles

## Example Tests
Read these to understand how tests work:
- `tests/basic-bun/lsp.spec.ts` - LSP testing example
- `tests/basic-jest/jest.spec.ts` - Jest framework example

## Available Test Utilities
Located in `tests/lib/`:
- `nvim.ts` - NeovimClient for communicating with Neovim
- `lsp.ts` - LSP-related helpers
- `cursor.ts` - Cursor position helpers
- `jest.ts` - Neotest integration helpers

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
bun test ./**/*.spec.ts
```
