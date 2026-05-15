return {
  {
    'nvim-treesitter/nvim-treesitter',
    branch = 'main',
    lazy = false,
    build = ':TSUpdate',
    config = function()
      require('nvim-treesitter').install {
        'bash', 'c', 'css', 'html', 'javascript', 'kotlin', 'lua', 'markdown',
        'markdown_inline', 'typescript', 'vim', 'vimdoc', 'vue',
      }

      vim.api.nvim_create_autocmd('FileType', {
        callback = function(args)
          pcall(vim.treesitter.start, args.buf)
        end,
      })
    end,
  },
}
