-- Helper functions for Neovim test client
-- This module is automatically injected when the NeovimClient starts

local M = {}

function M.setup()
  -- RPC print: sends log messages back to the test process via RPC notifications
  -- Works even when a UI is attached (unlike vim.api.nvim_out_write)
  _G.rpc_print = function(...)
    local args = {...}
    local msg = table.concat(vim.tbl_map(tostring, args), "\t")

    -- Find the RPC channel (the one that isn't a UI)
    local channels = vim.api.nvim_list_chans()
    for _, chan in ipairs(channels) do
      if chan.mode == "rpc" and chan.client then
        vim.rpcnotify(chan.id, "log_message", msg)
        return
      end
    end
  end

  -- Add more helper functions here as needed
end

M
