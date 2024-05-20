return {
  {
    'sindrets/diffview.nvim',
    config = function()
      local actions = require('diffview.config').actions

      local openDiffViewCommand = function()
        vim.cmd('DiffviewFileHistory % --no-merges --imply-local')
      end

      local openDiffFileHistoryCommand = function()
        vim.cmd('DiffviewOpen origin/main')
      end

      vim.keymap.set({ 'n', 'v' }, '<leader>v',
        openDiffFileHistoryCommand,
        { desc = 'File [V]ersion' }
      )
      vim.keymap.set('n', '<leader>V',
        openDiffViewCommand,
        { desc = 'Branch re[V]ision' }
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
            { { 'n',                   'v' }, '<leader>v', function()
              actions.close()
              openDiffViewCommand()
            end, { desc = 'File re[V]ision' } },
            { { 'n',                     'v' }, '<leader>V', function()
              actions.close()
              openDiffFileHistoryCommand()
            end, { desc = 'Branch re[V]ision' } },
            { 'n', 'gf',        actions.goto_file_edit,    { desc = '[G]o to [F]ile' } },
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
