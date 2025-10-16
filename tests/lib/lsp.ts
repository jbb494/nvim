import { NeovimClient } from "./nvim";

export async function waitForLsp(
  client: NeovimClient,
  timeoutMs: number = 5000,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // Poll for LSP clients attached to the current buffer using nvim_exec_lua
    const lspClients = await client.call("nvim_exec_lua", [
      "return vim.tbl_map(function(c) return {id = c.id, name = c.name} end, vim.lsp.get_clients({bufnr = 0}))",
      [],
    ]);
    if (lspClients && Array.isArray(lspClients) && lspClients.length > 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`LSP did not attach within ${timeoutMs}ms`);
}

export async function openFile(
  client: NeovimClient,
  path: string,
): Promise<void> {
  await client.call("nvim_command", [`edit ${path}`]);
}

export async function getFileName(client: NeovimClient): Promise<string> {
  const result = await client.call("nvim_call_function", ["expand", ["%"]]);
  if (typeof result !== "string") {
    throw new Error(`Expected string from expand('%'), got ${typeof result}`);
  }
  return result;
}

export async function setCursorPosition(
  client: NeovimClient,
  line: number,
  col: number,
): Promise<void> {
  // Neovim uses 1-indexed lines for cursor position
  await client.call("nvim_win_set_cursor", [0, [line + 1, col]]);
}

export async function requestHover(client: NeovimClient): Promise<unknown> {
  // Get the word under cursor
  const word = await client.call("nvim_exec_lua", [
    `
  return (function()
    -- Safely make the synchronous LSP request with a 1.5-second timeout
    local status, response = pcall(
      vim.lsp.buf_request_sync,
      0, -- current buffer
      'textDocument/hover',
      vim.lsp.util.make_position_params(),
      1500 -- timeout in milliseconds
    )

    -- If the request failed or timed out, exit early
    if not status or not response then
      return 'Hover request failed or timed out.'
    end

    -- Iterate over all potential client responses
    for _, client_response in pairs(response) do
      -- Check for a valid result with content
      if client_response and client_response.result and client_response.result.contents then
        -- Use the official utility to convert the result to plain markdown lines
        local markdown_lines = vim.lsp.util.convert_input_to_markdown_lines(
          client_response.result.contents
        )
        -- Join the lines into a single string and return it
        return table.concat(markdown_lines, '\\n')
      end
    end

    -- If the loop finishes, no hover info was found
    return 'No hover information available.'
  end)()
    `,
    [],
  ]);
  return word;
}

export async function getCursorPosition(
  client: NeovimClient,
): Promise<[number, number]> {
  const result = await client.call("nvim_win_get_cursor", [0]);
  if (!Array.isArray(result) || result.length < 2) {
    throw new Error(
      `Expected cursor position array, got ${JSON.stringify(result)}`,
    );
  }
  return [result[0] as number, result[1] as number];
}
