local finders = require "telescope.finders"
local make_entry = require "telescope.make_entry"
local pickers = require "telescope.pickers"
local utils = require "telescope.utils"

local custom_previewers = require "user.telescope.previewers.buffer_previewers"
local conf = require("telescope.config").values

local git = {}

local gen_main_finder = function(opts)
    local git_cmd = { "git", "diff", "--name-status", opts.commit }

    local output = utils.get_os_command_output(git_cmd, opts.cwd)

    if #output == 0 then
        print "No changes found"
        utils.notify("builtin.git_status", {
            msg = "No changes found",
            level = "WARN",
        })
        return
    end


    local result = {}
    for k, v in pairs(output) do
        result[k] = ' ' .. v:gsub('\t', ' ')
    end

    local entry_maker = vim.F.if_nil(opts.entry_maker, make_entry.gen_from_git_status(opts))

    return finders.new_table {
        results = result,
        entry_maker = entry_maker
    }
end

git.version_merge_base = function(opts)
    opts = opts or {}
    if opts.is_bare then
        utils.notify("builtin.git_status", {
            msg = "This operation must be run in a work tree",
            level = "ERROR",
        })
        return
    end

    local initial_finder = gen_main_finder(opts)

    pickers
        .new(opts, {
            prompt_title = "Git " .. opts.commit,
            finder = initial_finder,
            previewer = custom_previewers.git_file_diff_origin_main.new(opts),
            sorter = conf.file_sorter(opts),
            attach_mappings = opts.attach_mappings,
        })
        :find()
end


local set_opts_cwd = function(opts)
    if opts.cwd then
        opts.cwd = vim.fn.expand(opts.cwd)
    else
        opts.cwd = vim.loop.cwd()
    end

    -- Find root of git directory and remove trailing newline characters
    local git_root, ret = utils.get_os_command_output({ "git", "rev-parse", "--show-toplevel" }, opts.cwd)
    local use_git_root = vim.F.if_nil(opts.use_git_root, true)

    if ret ~= 0 then
        local in_worktree = utils.get_os_command_output({ "git", "rev-parse", "--is-inside-work-tree" }, opts.cwd)
        local in_bare = utils.get_os_command_output({ "git", "rev-parse", "--is-bare-repository" }, opts.cwd)

        if in_worktree[1] ~= "true" and in_bare[1] ~= "true" then
            error(opts.cwd .. " is not a git directory")
        elseif in_worktree[1] ~= "true" and in_bare[1] == "true" then
            opts.is_bare = true
        end
    else
        if use_git_root then
            opts.cwd = git_root[1]
        end
    end
end

local function apply_checks(mod)
    for k, v in pairs(mod) do
        mod[k] = function(opts)
            opts = vim.F.if_nil(opts, {})

            set_opts_cwd(opts)
            v(opts)
        end
    end

    return mod
end

return apply_checks(git)
