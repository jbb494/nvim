local function find_closest_jest_config(file_path)
  local util = require('lspconfig.util')
  local file_dir = vim.fn.fnamemodify(file_path, ":h")

  -- If not found in the immediate directory, traverse up until we hit a package.json
  local package_json = util.find_package_json_ancestor(file_dir)
  if package_json then
    for _, config_name in ipairs({ "jest.config.ts", "jest.config.js", "jest.config.cjs" }) do
      local config_path = util.path.join(package_json, config_name)
      if vim.fn.filereadable(config_path) == 1 then
        return config_path
      end
    end
    return package_json -- Return package.json directory as fallback
  end
end

return {
  {
    "nvim-neotest/neotest",
    dependencies = {
      "nvim-neotest/nvim-nio",
      "nvim-lua/plenary.nvim",
      "antoinemadec/FixCursorHold.nvim",
      "nvim-treesitter/nvim-treesitter",
      'nvim-neotest/neotest-jest',
    },
    config = function()
      require("neotest").setup({
        adapters = {
          require('neotest-jest')({
            jestConfigFile = function(file)
              return find_closest_jest_config(file)
            end,
            env = { CI = true, TZ = 'UTC' },
            cwd = function(file)
              -- Get directory of the found config or fallback to file directory
              local config_path = find_closest_jest_config(file)
              return vim.fn.fnamemodify(config_path, ":h")
            end,
          })
        },
      })
    end
  }
}
