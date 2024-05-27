return {
  {
    'stevearc/oil.nvim',
    opts = {
      use_default_keymaps = false,
      keymaps = {
        ["g?"] = "actions.show_help",
        ["<CR>"] = "actions.select",
        ["<C-s>"] = false,
        ["<C-h>"] = false,
        ["<C-t>"] = false,
        ["<C-p>"] = false,
        ["<C-c>"] = false,
        ["<C-l>"] = false,
        ["-"] = "actions.parent",
        ["_"] = "actions.open_cwd",
        ["`"] = "actions.cd",
        ["~"] = "actions.tcd",
        ["gs"] = "actions.change_sort",
        ["gx"] = "actions.open_external",
        ["g."] = "actions.toggle_hidden",
        ["g\\"] = "actions.toggle_trash",
        ["<leader>sf"] = function()
          local util = require("oil.util")

          local current_buffer = vim.api.nvim_get_current_buf()
          local title = vim.api.nvim_buf_get_name(current_buffer)
          local _scheme, path = util.parse_url(title)

          local custom_telescope = require 'user.telescope.files'
          custom_telescope.find_files { cwd = path }
        end,
        ["<leader>sg"] = function()
          local util = require("oil.util")

          local current_buffer = vim.api.nvim_get_current_buf()
          local title = vim.api.nvim_buf_get_name(current_buffer)
          local _scheme, path = util.parse_url(title)

          local builtin = require 'telescope.builtin'
          builtin.live_grep { cwd = path }
        end

      },

      view_options = {
        -- Show files and directories that start with "."
        show_hidden = true,
      },
      skip_confirm_for_simple_edits = true,
    },
    -- Optional dependencies
    dependencies = { "nvim-tree/nvim-web-devicons" },
  }
}
