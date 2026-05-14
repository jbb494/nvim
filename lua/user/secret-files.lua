local group = vim.api.nvim_create_augroup('SecretFiles', {})

vim.api.nvim_create_autocmd({ 'BufReadCmd', 'FileReadCmd', 'BufReadPre', 'BufNewFile' }, {
  group = group,
  pattern = { '*.gpg', '*.pgp', '*.asc' },
  callback = function(args)
    local file = vim.fn.fnamemodify(args.file, ':~:.')

    vim.schedule(function()
      vim.notify('Use secedit for encrypted files: ' .. file, vim.log.levels.ERROR)

      if vim.api.nvim_buf_is_valid(args.buf) then
        vim.api.nvim_buf_delete(args.buf, { force = true })
      end
    end)

    error 'Refusing to open encrypted file outside secedit'
  end,
})
