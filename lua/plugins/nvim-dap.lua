return {
  {
    "mfussenegger/nvim-dap",
    config = function()
      local dap = require("dap")

      dap.adapters["pwa-node"] = {
        type = "server",
        host = "127.0.0.1",
        port = "${port}",
        executable = {
          command = "node",
          args = { os.getenv('HOME') .. "/.local/share/nvim/mason/packages/js-debug-adapter/js-debug/src/dapDebugServer.js", "${port}" },
        }
      }

      dap.configurations.javascript = {
        {
          type = "pwa-node",
          request = "launch",
          name = "Launch file",
          program = "${file}",
          console = 'integratedTerminal',
          cwd = "${workspaceFolder}",
          stopOnEntry = true
        },
      }

      dap.set_log_level('ERROR')
    end
  },
  {
    "rcarriga/nvim-dap-ui",
    dependencies = {
      "mfussenegger/nvim-dap",
      "nvim-neotest/nvim-nio",
    },
    config = function()
      local dap, dapui = require("dap"), require("dapui")

      dapui.setup({
        layouts = { {
          elements = { {
            id = "console",
            size = 1
          } },
          position = "right",
          size = 50
        },
        }
      })

      dap.listeners.before.attach.dapui_config = function()
        dapui.open()
      end
      dap.listeners.before.launch.dapui_config = function()
        dapui.open()
      end
      dap.listeners.before.event_terminated.dapui_config = function()
        dapui.close()
      end
      dap.listeners.before.event_exited.dapui_config = function()
        dapui.close()
      end

      -- local events = {
      --   'event_breakpoint',
      --   'event_capabilities',
      --   'event_continued',
      --   'event_exited',
      --   'event_initialized',
      --   'event_invalidated',
      --   'event_loadedSource',
      --   'event_memory',
      --   'event_module',
      --   'event_output',
      --   'event_process',
      --   'event_progressEnd',
      --   'event_progressStart',
      --   'event_progressUpdate',
      --   'event_stopped',
      --   'event_terminated',
      --   'event_thread',
      -- }
      --
      -- for key, value in pairs(events) do
      --   dap.listeners.before[value].dapui_print = function()
      --     print(value)
      --   end
      -- end
    end
  },
}
