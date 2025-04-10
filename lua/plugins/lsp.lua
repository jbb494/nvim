return { {
  'neovim/nvim-lspconfig',
  dependencies = {
    'williamboman/mason.nvim',
    'williamboman/mason-lspconfig.nvim',
    'hrsh7th/cmp-nvim-lsp',
    'j-hui/fidget.nvim',
  },
  config = function()
    local cmp_lsp = require 'cmp_nvim_lsp'
    local capabilities = vim.tbl_deep_extend('force', {}, vim.lsp.protocol.make_client_capabilities(),
      cmp_lsp.default_capabilities())

    require('fidget').setup {}
    require('mason').setup()
    local lspconfig = require('lspconfig')

    require('mason-lspconfig').setup {
      ensure_installed = {
        'lua_ls',
        'rust_analyzer',
        'volar',
        'eslint@4.8.0',
        'ts_ls'
      },
      handlers = {
        function(server_name) -- default handler (optional)
          lspconfig[server_name].setup {
            capabilities = capabilities,
          }
        end,
        ['ts_ls'] = function()
          lspconfig.ts_ls.setup {
            capabilities = capabilities,
            root_dir = function(fname)
              local util = require("lspconfig.util")
              return util.root_pattern(".git")(fname)
                  or util.root_pattern("package.json", "tsconfig.json", "jsconfig.json")(fname)
            end,
            -- Important for monorepos - make sure tsserver can see the whole project
            init_options = {
              disableAutomaticTypingAcquisition = false,
              -- This setting is important for monorepos
              maxTsServerMemory = 8192,
              -- Enable project-wide refactoring
              preferences = {
                includePackageJsonAutoImports = "on",
              }
            },
            -- For monorepos, you might need to set this to get full project awareness
            -- Make sure to always work from the root
            cmd = { "typescript-language-server", "--stdio" },
            flags = {
              debounce_text_changes = 150,
            }
          }
        end,
        ['eslint'] = function()
          lspconfig['eslint'].setup {
            capabilities = capabilities,
          }
        end,
        ['volar'] = function()
          local function get_typescript_server_path(root_dir)
            local util = require 'lspconfig.util'

            local project_root = util.find_node_modules_ancestor(root_dir)
            return project_root and (util.path.join(project_root, 'node_modules', 'typescript', 'lib')) or ''
          end

          lspconfig.volar.setup {
            capabilities = capabilities,
            filetypes = { 'vue' },
            init_options = {
              vue = {
                hybridMode = false,
              },
              typescript = {
                tsdk = get_typescript_server_path(vim.fn.getcwd()),
              },
            }
          }
        end,
        ['lua_ls'] = function()
          lspconfig.lua_ls.setup {
            capabilities = capabilities,
            settings = {
              Lua = {
                diagnostics = {
                  globals = { 'vim', 'it', 'describe', 'before_each', 'after_each' },
                },
              },
            },
          }
        end,
      },
    }

    vim.api.nvim_create_autocmd('LspAttach', {
      group = vim.api.nvim_create_augroup('kickstart-lsp-attach', { clear = true }),
      callback = function(event)
        require('user.remap').map_lsp_keybinds(event.buf)

        local client = vim.lsp.get_client_by_id(event.data.client_id)
        if client and client.server_capabilities.documentHighlightProvider then
          vim.api.nvim_create_autocmd({ 'CursorHold', 'CursorHoldI' }, {
            buffer = event.buf,
            callback = vim.lsp.buf.document_highlight,
          })

          vim.api.nvim_create_autocmd({ 'CursorMoved', 'CursorMovedI' }, {
            buffer = event.buf,
            callback = vim.lsp.buf.clear_references,
          })
        end
      end,
    })
  end,
} }
