import assert from "assert";

assert(
  !process.env.LOG_LEVEL || ["DEBUG"].includes(process.env.LOG_LEVEL),
  "LOG_LEVEL must be either undefined or DEBUG",
);

if (process.env.LOG_LEVEL !== "DEBUG") {
  console.debug = () => {};
}
