import { array, number, parse, tuple } from "valibot";
import { NeovimClient } from "./nvim";

/**
 * Search for a pattern and move cursor to it
 * Generic search function that can be used for any text pattern
 */
export async function setCursorOnSearch(
  client: NeovimClient,
  searchPattern: string,
) {
  await client.call("nvim_exec_lua", [`vim.fn.search('${searchPattern}')`, []]);
}

export async function getCursorPosition(client: NeovimClient) {
  const result = await client.call("nvim_win_get_cursor", [0]);
  const CursorPositionSchema = tuple([number(), number()]);
  const parsed = parse(CursorPositionSchema, result);

  return parsed;
}
