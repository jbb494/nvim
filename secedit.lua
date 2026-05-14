vim.opt.swapfile = false
vim.opt.backup = false
vim.opt.writebackup = false
vim.opt.undofile = false
vim.opt.shada = ''
vim.opt.shadafile = 'NONE'
vim.opt.history = 0
vim.opt.modeline = false

vim.g.GPGPreferSymmetric = 1
vim.g.GPGUsePipes = 1

vim.cmd 'runtime plugin/gnupg.vim'
