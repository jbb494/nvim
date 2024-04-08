local calculateCwd = function(file)
  if string.find(file, "/apps/") then
    return string.match(file, "(.-/[^/]+/)src")
  end
  return vim.fn.getcwd()
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
      require('neotest-jest')({
        jestCommand = "npm test --",
        jestConfigFile = function(file)
          local cwd = calculateCwd(file)

          return cwd .. "/jest.config.ts"
        end,
        env = { CI = true },
        cwd = function(file)
          local cwd = calculateCwd(file)

          return cwd
        end
      })

      require("neotest").setup({
        adapters = {
          require('neotest-jest')
        },
      })
    end
  }
}
