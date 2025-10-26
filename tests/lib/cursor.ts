import { number, parse, tuple } from "valibot";
import { NeovimClient } from "./nvim";

/**
 * Send keypresses to Neovim, supporting <leader> notation
 * @param keys - Keys to send, e.g. "<leader>t", "<Esc>", "gg"
 */
export async function sendKeys(client: NeovimClient, keys: string) {
  await client.call("nvim_exec_lua", [
    `vim.api.nvim_feedkeys(
      vim.api.nvim_replace_termcodes("${keys.replace(/"/g, '\\"')}", true, false, true),
      "x",
      false
    )`,
    [],
  ]);
}

/**
 * Search for a pattern and move cursor to it
 * Generic search function that can be used for any text pattern
 */
export async function setCursorOnSearch(
  client: NeovimClient,
  searchPattern: string,
) {
  await client.call("nvim_exec_lua", [
    `vim.fn.search("${searchPattern.replace(/"/g, '\\"')}")`,
    [],
  ]);
}

export async function getCursorPosition(client: NeovimClient) {
  const result = await client.call("nvim_win_get_cursor", [0]);
  const CursorPositionSchema = tuple([number(), number()]);
  const parsed = parse(CursorPositionSchema, result);

  return parsed;
}
