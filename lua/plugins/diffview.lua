return {
  {
    'sindrets/diffview.nvim',
    config = function()
      local actions = require('diffview.config').actions

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
            { 'n', '<leader>vf', function()
              -- We should here get the real file name from diffview, since nvim is a tmp file
              openDiffFileHistoryCommand()
            end, { desc = '[V]ersion history [P]ath' } },

            { 'v', '<leader>vf', function()
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
