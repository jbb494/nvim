M = {}

local function getPositionsSorted(positions)
    table.sort(positions, function(a, b)
        if (a[2] < b[2]) then
            return true
        elseif (a[2] == b[2]) then
            if (a[3] < b[3]) then
                return true
            else
                return false
            end
        else
            return false
        end
    end)
end

-- We have a problem here, that when the cursor is on the left it doesnt work.
M.get_visual_selection = function()
    local raw_start = vim.fn.getpos("v")
    local raw_end = vim.fn.getpos(".")
    local positions = { raw_start, raw_end }
    vim.print(positions)
    getPositionsSorted(positions)
    vim.print(positions)

    local s_start = positions[1]
    local s_end = positions[2]

    local n_lines = math.abs(s_end[2] - s_start[2]) + 1
    local lines = vim.api.nvim_buf_get_lines(0, s_start[2] - 1, s_end[2], false)
    lines[1] = string.sub(lines[1], s_start[3], -1)
    if n_lines == 1 then
        lines[n_lines] = string.sub(lines[n_lines], 1, s_end[3] - s_start[3] + 1)
    else
        lines[n_lines] = string.sub(lines[n_lines], 1, s_end[3])
    end
    vim.print({ s_start, s_end, n_lines, lines })

    local result = table.concat(lines, '\n')

    return result
end

return M
