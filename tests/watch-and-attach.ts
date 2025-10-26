import { watch } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { spawn } from "bun";
import { readdir } from "fs/promises";

// Check for --help flag
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
watch-and-attach - Automatically attach to nvim test instances

USAGE:
  bun watch-and-attach.ts

DESCRIPTION:
  Watches for new nvim test instances and automatically attaches to them
  in the current tmux pane. Run tests with DEBUG_NVIM=1 to create sockets.

COMMANDS:
  To disconnect from an attached nvim instance:
    :detach              (Do NOT use :qa - it will close the test server!)

  To stop the watcher:
    Ctrl+C               (in the watcher pane)

EXAMPLE:
  # In one tmux pane:
  bun watch-and-attach.ts

  # In another pane:
  DEBUG_NVIM=1 bun test tests/basic-jest/jest.spec.ts
`);
  process.exit(0);
}

const socketDir = join(tmpdir(), "nvim-test-sockets");
const attachedSockets = new Set<string>();

const result = spawn({
  cmd: ["tmux", "display-message", "-p", "#{pane_id}"],
  stdout: "pipe",
});

const output = await new Response(result.stdout).text();
const watcherPaneId = output.trim();

async function attachToSocket(socketPath: string) {
  if (attachedSockets.has(socketPath)) return;

  try {
    await spawn({
      cmd: ["tmux", "send-keys", "-t", watcherPaneId, "C-z"],
      stdio: ["ignore", "ignore", "ignore"],
    });

    const nvimCommand = `nvim --server ${socketPath} --remote-ui; fg`;

    await spawn({
      cmd: ["tmux", "send-keys", "-t", watcherPaneId, nvimCommand, "C-m"],
      stdio: ["ignore", "ignore", "ignore"],
    });

    attachedSockets.add(socketPath);
    console.log(`✅ Attached to ${socketPath} in current pane`);
  } catch (err) {
    console.error(`❌ Failed to attach:`, err);
  }
}

const existing = await readdir(socketDir).catch(() => []);
for (const file of existing) {
  if (file.endsWith(".sock")) {
    await attachToSocket(join(socketDir, file));
  }
}

console.log(`👀 Watching ${socketDir} for new nvim test instances...`);
console.log(`   Run tests with: DEBUG_NVIM=1 bun test <test-file>\n`);

watch(socketDir, async (event, filename) => {
  if (filename && filename.endsWith(".sock")) {
    const socketPath = join(socketDir, filename);

    await Bun.sleep(100);
    await attachToSocket(socketPath);
  }
});
