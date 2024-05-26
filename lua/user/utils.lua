M = {}

local function region_to_text(region)
    local text = ''
    local maxcol = vim.v.maxcol
    for line, cols in vim.spairs(region) do
        local endcol = cols[2] == maxcol and -1 or cols[2]
        local chunk = vim.api.nvim_buf_get_text(0, line, cols[1], line, endcol, {})[1]
        text = ('%s%s\n'):format(text, chunk)
    end
    return text
end

M.get_visual_selection = function()
    local current_buf = vim.api.nvim_get_current_buf()

    local r = vim.region(current_buf, "<", ">", vim.fn.visualmode(), true)
    return region_to_text(r)
end


return M
