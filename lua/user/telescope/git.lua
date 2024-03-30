local finders = require "telescope.finders"
local make_entry = require "telescope.make_entry"
local pickers = require "telescope.pickers"
local Path = require "plenary.path"

local conf = require("telescope.config").values

local git = {}

local flatten = vim.tbl_flatten
local filter = vim.tbl_filter

local get_open_filelist = function(grep_open_files, cwd)
    if not grep_open_files then
        return nil
    end

    local bufnrs = filter(function(b)
        if 1 ~= vim.fn.buflisted(b) then
            return false
        end
        return true
    end, vim.api.nvim_list_bufs())
    if not next(bufnrs) then
        return
    end

    local filelist = {}
    for _, bufnr in ipairs(bufnrs) do
        local file = vim.api.nvim_buf_get_name(bufnr)
        table.insert(filelist, Path:new(file):make_relative(cwd))
    end
    return filelist
end

local opts_contain_invert = function(args)
    local invert = false
    local files_with_matches = false

    for _, v in ipairs(args) do
        if v == "--invert-match" then
            invert = true
        elseif v == "--files-with-matches" or v == "--files-without-match" then
            files_with_matches = true
        end

        if #v >= 2 and v:sub(1, 1) == "-" and v:sub(2, 2) ~= "-" then
            local non_option = false
            for i = 2, #v do
                local vi = v:sub(i, i)
                if vi == "=" then -- ignore option -g=xxx
                    break
                elseif vi == "g" or vi == "f" or vi == "m" or vi == "e" or vi == "r" or vi == "t" or vi == "T" then
                    non_option = true
                elseif non_option == false and vi == "v" then
                    invert = true
                elseif non_option == false and vi == "l" then
                    files_with_matches = true
                end
            end
        end
    end
    return invert, files_with_matches
end


local escape_chars = function(string)
    return string.gsub(string, "[%(|%)|\\|%[|%]|%-|%{%}|%?|%+|%*|%^|%$|%.]", {
        ["\\"] = "\\\\",
        ["-"] = "\\-",
        ["("] = "\\(",
        [")"] = "\\)",
        ["["] = "\\[",
        ["]"] = "\\]",
        ["{"] = "\\{",
        ["}"] = "\\}",
        ["?"] = "\\?",
        ["+"] = "\\+",
        ["*"] = "\\*",
        ["^"] = "\\^",
        ["$"] = "\\$",
        ["."] = "\\.",
    })
end

git.grep = function(opts)
    -- TODO: This should probably check your visual selection as well, if you've got one
    opts.cwd = opts.cwd and vim.fn.expand(opts.cwd) or vim.loop.cwd()
    local vimgrep_arguments = vim.F.if_nil(opts.vimgrep_arguments, conf.vimgrep_arguments)
    local word = vim.F.if_nil(opts.search, vim.fn.expand "<cword>")
    local search = opts.use_regex and word or escape_chars(word)

    local additional_args = {}
    if opts.additional_args ~= nil then
        if type(opts.additional_args) == "function" then
            additional_args = opts.additional_args(opts)
        elseif type(opts.additional_args) == "table" then
            additional_args = opts.additional_args
        end
    end

    if opts.file_encoding then
        additional_args[#additional_args + 1] = "--encoding=" .. opts.file_encoding
    end

    if search == "" then
        search = { "-v", "--", "^[[:space:]]*$" }
    else
        search = { "--", search }
    end

    local args = flatten {
        vimgrep_arguments,
        additional_args,
        opts.word_match,
        search,
    }
    opts.__inverted, opts.__matches = opts_contain_invert(args)

    -- also at the start of the function remmeber to check if git repo and non bare
    -- here instead of open files need to grab status files
    if opts.grep_open_files then
        for _, file in ipairs(get_open_filelist(opts.grep_open_files, opts.cwd)) do
            table.insert(args, file)
        end
    elseif opts.search_dirs then
        for _, path in ipairs(opts.search_dirs) do
            table.insert(args, vim.fn.expand(path))
        end
    end

    vim.api.nvim_echo({ { string.format("args: %s", vim.inspect(args)) } }, false, {})

    opts.entry_maker = opts.entry_maker or make_entry.gen_from_vimgrep(opts)
    --     pickers
    --         .new(opts, {
    --             prompt_title = "Find Word (" .. word:gsub("\n", "\\n") .. ")",
    --             finder = finders.new_oneshot_job(args, opts),
    --             previewer = conf.grep_previewer(opts),
    --             sorter = conf.generic_sorter(opts),
    --         })
    --         :find()
end

git.grep({})
