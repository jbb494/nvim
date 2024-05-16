local finders = require "telescope.finders"
local make_entry = require "telescope.make_entry"
local pickers = require "telescope.pickers"
local utils = require "telescope.utils"

local conf = require("telescope.config").values

local git = {}

local function get_main_branch()
    local branch = vim.fn.system("git branch -l master main")

    if (vim.v.shell_error ~= 0) then
        return nil
    end

    return branch:gsub("%s+$", "")
end

local function get_merge_base()
    local branch = get_main_branch()
    if (branch == nil) then
        return nil
    end

    local merge_base = vim.fn.system("git merge-base HEAD " .. branch)

    -- Check for errors in execution or empty output
    if vim.v.shell_error ~= 0 then
        return nil
    else
        return merge_base:gsub("%s+$", "")
    end
end

git.version_merge_base = function(opts)
    opts = opts or {}

    if opts.is_bare then
        utils.notify("builtin.git_files", {
            msg = "This operation must be run in a work tree",
            level = "ERROR",
        })
        return
    end

    local mergeBase = get_merge_base()

    if (mergeBase == nil) then
        utils.notify("custom.version_merge_base", {
            msg = "You are in the main branch",
            level = "WARN"
        })
        return
    end
    local show_untracked = vim.F.if_nil(opts.show_untracked, false)
    local recurse_submodules = vim.F.if_nil(opts.recurse_submodules, false)
    if show_untracked and recurse_submodules then
        utils.notify("builtin.git_files", {
            msg = "Git does not support both --others and --recurse-submodules",
            level = "ERROR",
        })
        return
    end

    -- By creating the entry maker after the cwd options,
    -- we ensure the maker uses the cwd options when being created.
    opts.entry_maker = vim.F.if_nil(opts.entry_maker, make_entry.gen_from_file(opts))


    local gen_new_finder = function()
        local expand_dir = vim.F.if_nil(opts.expand_dir, true)
        local git_cmd = { "git", "diff", mergeBase, "-z", "--name-status", "--", "." }

        if expand_dir then
          table.insert(git_cmd, #git_cmd - 1, "-u")
        end
        vim.print(git_cmd)

        local output = utils.get_os_command_output(git_cmd, opts.cwd)

        if #output == 0 then
          print "No changes found"
          utils.notify("builtin.git_status", {
            msg = "No changes found",
            level = "WARN",
          })
          return
        end

        return finders.new_table {
          results = vim.split(output[1], " ", { trimempty = true }),
          entry_maker = vim.F.if_nil(opts.entry_maker, make_entry.gen_from_git_status(opts)),
        }
    end

    local initial_finder = gen_new_finder()
        if not initial_finder then
        return
    end

    pickers
        .new(opts, {
            prompt_title = "Git Files",
            finder = initial_finder,
            previewer = conf.file_previewer(opts),
            sorter = conf.file_sorter(opts),
        })
        :find()
end



return git
