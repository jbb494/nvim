local actions = require "telescope.actions"
local action_state = require "telescope.actions.state"
local finders = require "telescope.finders"
local make_entry = require "telescope.make_entry"
local pickers = require "telescope.pickers"
local utils = require "telescope.utils"
local previewers = require "telescope.previewers"

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
    if opts.is_bare then
    utils.notify("builtin.git_status", {
      msg = "This operation must be run in a work tree",
      level = "ERROR",
    })
    return
  end

  local gen_new_finder = function()
    local expand_dir = vim.F.if_nil(opts.expand_dir, true)
    local git_cmd = { "git", "status", "-z", "--", "." }

    if expand_dir then
      table.insert(git_cmd, #git_cmd - 1, "-u")
    end

    local output = utils.get_os_command_output(git_cmd, opts.cwd)

    if #output == 0 then
      print "No changes found"
      utils.notify("builtin.git_status", {
        msg = "No changes found",
        level = "WARN",
      })
      return
    end

    local result = vim.split(output[1], " ", { trimempty = true })
    vim.print(result)

    return finders.new_table {
      results = result,
      entry_maker = vim.F.if_nil(opts.entry_maker, make_entry.gen_from_git_status(opts)),
    }
  end

  local initial_finder = gen_new_finder()
  if not initial_finder then
    return
  end

  pickers
    .new(opts, {
      prompt_title = "Git Status",
      finder = initial_finder,
      previewer = previewers.git_file_diff.new(opts),
      sorter = conf.file_sorter(opts),
      attach_mappings = function(prompt_bufnr, map)
        actions.git_staging_toggle:enhance {
          post = function()
            action_state.get_current_picker(prompt_bufnr):refresh(gen_new_finder(), { reset_prompt = true })
          end,
        }

        map({ "i", "n" }, "<tab>", actions.git_staging_toggle)
        return true
      end,
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
