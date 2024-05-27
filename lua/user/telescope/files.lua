local M = {}

function M.find_files(opts)
    opts = opts or {}

    local builtin = require 'telescope.builtin'
    if (not opts.find_command) then
        opts.find_command = {
            'rg', '--files', '--hidden', '-g', '!.git'
        }
    end

    builtin.find_files(opts)
end

return M
