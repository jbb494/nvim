local file = "/apps/bim/src/test/component/component.spec.ts"

print(string.find(file, "/apps/"))
print(string.match(file, "(.-/[^/]+/)src") .. "jest.config.ts")
print(string.match(file, "(.-/[^/]+/)src"))
