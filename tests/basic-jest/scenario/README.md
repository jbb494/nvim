# Basic Jest Scenario

A basic test scenario demonstrating Jest testing with TypeScript in Neovim.

## Setup

This scenario was initialized with `bun init` and Jest installed as a dev dependency:

```bash
bun init
bun add -d jest @types/jest ts-jest @types/node
```

## Running Tests

To run all tests:

```bash
npm test
# or
npx jest
```

To run tests in watch mode:

```bash
npx jest --watch
```

## Test Files

- `src/math.ts` - Simple math functions (add, subtract, multiply, divide)
- `src/math.test.ts` - Jest test suite with 11 passing tests

## Using with Neovim

You can run tests using Neovim keybindings defined in `remap.lua`:

- `<leader>t` - Run tests in current file
- `<leader>T` - Stop running tests
- `<leader>lt` - Run last test
- `<leader>ot` - Open test output

The test runner uses Neotest with neotest-jest adapter for IDE integration.

## Configuration

- `jest.config.cjs` - Jest configuration with ts-jest preset
- `tsconfig.json` - TypeScript configuration for Jest compatibility
- `package.json` - Project dependencies and scripts
