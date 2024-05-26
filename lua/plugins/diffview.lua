return {
  {
    'sindrets/diffview.nvim',
    config = function()
      local actions = require('diffview.config').actions
      local custom = require 'user.telescope.git'

      local openDiffViewCommand = function()
        vim.cmd('DiffviewOpen origin/main')
      end
      local openDiffViewCommandHead = function()
        vim.cmd('DiffviewOpen HEAD')
      end
      local openDiffFileHistoryCommand = function()
        vim.cmd('DiffviewFileHistory % --no-merges --imply-local')
      end
      local openDiffLineHistoryCommand = function()
        vim.cmd("'<,'>DiffviewFileHistory --no-merges --imply-local")
      end

      vim.keymap.set('n', '<leader>vp',
        openDiffFileHistoryCommand,
        { desc = '[V]ersion history [P]ath' }
      )
      vim.keymap.set('v', '<leader>vp',
        openDiffLineHistoryCommand,
        { desc = '[V]ersion history [P]ath and line' }
      )

      vim.keymap.set('n', '<leader>vh',
        openDiffViewCommandHead,
        { desc = '[V]ersion [H]ead' }
      )

      vim.keymap.set('n', '<leader>V',
        openDiffViewCommand,
        { desc = '[V]ersion branch' }
      )

      require('diffview').setup({
        hooks = {
          view_opened = function(view)
            view.panel:toggle(false)
            view.panel:toggle(false)
          end,
        },
        keymaps = {
          view = {
            { 'n', '<leader>vp', function()
              -- We should here get the real file name from diffview, since nvim is a tmp file
              openDiffFileHistoryCommand()
            end, { desc = '[V]ersion history [P]ath' } },

            { 'v', '<leader>vp', function()
              -- We should here get the real file name from diffview, since nvim is a tmp file
              -- If we don't, we get an error when trying to file history from the diffview panel.
              -- Maybe checkout (go to file history, from diff view, action exists in diffview)
              openDiffLineHistoryCommand()
            end, { desc = '[V]ersion history [P]ath and line' } },

            { 'n', '<leader>V', function()
              openDiffViewCommand()
            end, { desc = '[V]ersion branch' } },
            { 'n', 'gf', function()
              actions.goto_file_edit()
              vim.cmd('tabclose #')
            end, { desc = '[G]o to [F]ile' } },
            { 'n', ']v',        actions.select_next_entry, { desc = 'Next file/line [V]ersion' } },
            { 'n', '[v',        actions.select_prev_entry, { desc = 'Previous file/line [V]ersion' } },
            { 'n', '<leader>b', actions.focus_files,       { desc = 'Focus files' } },
            { 'n', '<leader>sv', function()
              local telescope_action_state = require "telescope.actions.state"
              local telescope_actions = require "telescope.actions"
              local telescope_utils = require "telescope.utils"
              local lib = require('diffview.lib')
              local view = lib.get_current_view()

              local commit = view.rev_arg

              local attach_mappings = function(prompt_bufnr)
                telescope_actions.select_default:replace(function()
                  telescope_actions.close(prompt_bufnr)
                  local entry = telescope_action_state.get_selected_entry()
                  if not entry then
                    telescope_utils.notify("actions.set.edit", {
                      msg = "Nothing currently selected",
                      level = "WARN",
                    })
                    return
                  end

                  view:set_file_by_path(entry.value)
                end)

                return true
              end

              custom.version_merge_base { commit = commit, attach_mappings = attach_mappings }
            end, { desc = '[S]earch [V]ersion control' } },
          },
          file_panel = {
            { 'n', '<leader>b', actions.focus_entry, { desc = 'Focus entry' } },
          },
          file_history_panel = {
            { 'n', '<leader>b', actions.focus_entry, { desc = 'Focus entry' } },
          }
        }
      })
    end
  }
}
