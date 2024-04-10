return {
  {
    'sindrets/diffview.nvim',
    config = function()
      local remap = require('user.remap')

      require('diffview').setup({ hooks = { view_opened = remap.set_diff_file_history_after_open_keybindings, view_closed = remap.set_diff_file_history_keybindings } })

      remap.set_diff_file_history_keybindings()
    end
  }
}
