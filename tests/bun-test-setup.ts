// Only suppress debug logs if DEBUG_NVIM is not set
if (!process.env.DEBUG_NVIM) {
  console.debug = () => {};
}
