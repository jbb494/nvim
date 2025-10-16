import { NeovimClient } from "./nvim";

export async function openFile(client: NeovimClient, path: string): Promise<void> {
  await client.call("nvim_command", [`edit ${path}`]);
}

export async function getFileName(client: NeovimClient): Promise<string> {
  const result = await client.call("nvim_call_function", ["expand", ["%"]]);
  if (typeof result !== "string") {
    throw new Error(`Expected string from expand('%'), got ${typeof result}`);
  }
  return result;
}

export async function requestHover(client: NeovimClient): Promise<unknown> {
  return await client.call("vim.lsp.buf.hover", []);
}

export async function getCursorPosition(client: NeovimClient): Promise<[number, number]> {
  const result = await client.call("nvim_win_get_cursor", [0]);
  if (!Array.isArray(result) || result.length < 2) {
    throw new Error(`Expected cursor position array, got ${JSON.stringify(result)}`);
  }
  return [result[0] as number, result[1] as number];
}
