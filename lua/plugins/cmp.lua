return {
  'hrsh7th/nvim-cmp',
  dependencies = {
    'neovim/nvim-lspconfig',
    'hrsh7th/cmp-buffer',
    'hrsh7th/cmp-path',
    'hrsh7th/cmp-cmdline',
    'L3MON4D3/LuaSnip'
  },
  config = function()
    local cmp = require 'cmp'
    local cmp_select = { behavior = cmp.SelectBehavior.Select }

    cmp.setup {
      snippet = {
        expand = function(args)
          require('luasnip').lsp_expand(args.body) -- For `luasnip` users.
        end,
      },
      mapping = cmp.mapping.preset.insert {
        ['<C-p>'] = cmp.mapping.select_prev_item(cmp_select),
        ['<C-n>'] = cmp.mapping.select_next_item(cmp_select),
        ['<C-y>'] = cmp.mapping.confirm { select = true },
        ['<C-Space>'] = cmp.mapping.complete(),
      },
      sources = cmp.config.sources({
        { name = 'nvim_lsp' },
      }, {
        { name = 'buffer' },
      }),
    }
  end

}
-- return { {
--   'neovim/nvim-lspconfig',
--   dependencies = {
--     'williamboman/mason.nvim',
--     'williamboman/mason-lspconfig.nvim',
--     'hrsh7th/cmp-nvim-lsp',
--     'hrsh7th/cmp-buffer',
--     'hrsh7th/cmp-path',
--     'hrsh7th/cmp-cmdline',
--     'hrsh7th/nvim-cmp',
--     'L3MON4D3/LuaSnip',
--     'saadparwaiz1/cmp_luasnip',
--     'j-hui/fidget.nvim',
--   },
--
--   config = function()
--     local cmp = require 'cmp'
--     local cmp_lsp = require 'cmp_nvim_lsp'
--     local capabilities = vim.tbl_deep_extend('force', {}, vim.lsp.protocol.make_client_capabilities(),
--       cmp_lsp.default_capabilities())
--
--     require('fidget').setup {}
--     require('mason').setup()
--     require('mason-lspconfig').setup {
--       ensure_installed = {
--         'lua_ls',
--         'rust_analyzer',
--         'tsserver',
--       },
--       handlers = {
--         function(server_name) -- default handler (optional)
--           require('lspconfig')[server_name].setup {
--             capabilities = capabilities,
--           }
--         end,
--
--         ['lua_ls'] = function()
--           local lspconfig = require 'lspconfig'
--           lspconfig.lua_ls.setup {
--             capabilities = capabilities,
--             settings = {
--               Lua = {
--                 diagnostics = {
--                   globals = { 'vim', 'it', 'describe', 'before_each', 'after_each' },
--                 },
--               },
--             },
--           }
--         end,
--       },
--     }
--
--     local cmp_select = { behavior = cmp.SelectBehavior.Select }
--
--     cmp.setup {
--       snippet = {
--         expand = function(args)
--           require('luasnip').lsp_expand(args.body) -- For `luasnip` users.
--         end,
--       },
--       mapping = cmp.mapping.preset.insert {
--         ['<C-p>'] = cmp.mapping.select_prev_item(cmp_select),
--         ['<C-n>'] = cmp.mapping.select_next_item(cmp_select),
--         ['<C-y>'] = cmp.mapping.confirm { select = true },
--         ['<C-Space>'] = cmp.mapping.complete(),
--       },
--       sources = cmp.config.sources({
--         { name = 'nvim_lsp' },
--         { name = 'luasnip' }, -- For luasnip users.
--       }, {
--         { name = 'buffer' },
--       }),
--     }
--
--     vim.diagnostic.config {
--       -- update_in_insert = true,
--       float = {
--         focusable = false,
--         style = 'minimal',
--         border = 'rounded',
--         source = 'always',
--         header = '',
--         prefix = '',
--       },
--     }
--     vim.api.nvim_create_autocmd('LspAttach', {
--       group = vim.api.nvim_create_augroup('kickstart-lsp-attach', { clear = true }),
--       callback = function(event)
--         require('user.remap').map_lsp_keybinds(event.buf)
--
--         local client = vim.lsp.get_client_by_id(event.data.client_id)
--         if client and client.server_capabilities.documentHighlightProvider then
--           vim.api.nvim_create_autocmd({ 'CursorHold', 'CursorHoldI' }, {
--             buffer = event.buf,
--             callback = vim.lsp.buf.document_highlight,
--           })
--
--           vim.api.nvim_create_autocmd({ 'CursorMoved', 'CursorMovedI' }, {
--             buffer = event.buf,
--             callback = vim.lsp.buf.clear_references,
--           })
--         end
--       end,
--     })
--   end,
-- } }
