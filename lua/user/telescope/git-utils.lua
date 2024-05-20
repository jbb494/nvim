local M = {}

M.get_main_branch = function()
    local branch = vim.fn.system("git branch -l master main")

    if (vim.v.shell_error ~= 0) then
        return nil
    end

    return branch:gsub("%s+$", "")
end

M.get_merge_base = function()
    local branch = M.get_main_branch()
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


return M
