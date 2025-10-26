import { sleep, spawn } from "bun";
import { Packr, Unpackr } from "msgpackr";
import { mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import assert from "assert";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: Timer;
  method: string;
  params: unknown[];
}

export class NeovimClient {
  process: Bun.Subprocess<"ignore", "ignore", "ignore"> | null = null;
  private socket: any = null;
  private packr = new Packr({ useRecords: false });
  private rpcId = 0;
  private pendingRequests = new Map<number, PendingRequest>();
  private buffer = Buffer.alloc(0);
  private socketPath: string | undefined;

  constructor() {}

  async start(workingDir: string, configPath: string): Promise<void> {
    // Create a unique socket path for this test instance
    const tempDir = join(tmpdir(), "nvim-test-sockets");
    mkdirSync(tempDir, { recursive: true });

    this.socketPath = join(tempDir, `${Date.now()}.sock`);
    const args = ["--listen", this.socketPath, "--headless", "-u", configPath];

    this.process = spawn({
      cmd: ["nvim", ...args],
      cwd: workingDir,
      stdio: ["ignore", "ignore", "ignore"],
    });

    await this.waitForConnection(15000);
    await this.injectHelpers();
  }

  private async injectHelpers(): Promise<void> {
    const helpersPath = join(__dirname, "nvim-helpers.lua");
    const luaCode = readFileSync(helpersPath, "utf-8");

    // Execute the helper module and call setup()
    // The lua file evaluates to M (the module table), so we can call setup() on it
    await this.call("nvim_exec_lua", [luaCode + ".setup()", []]);
  }

  private async waitForConnection(timeoutMs: number): Promise<void> {
    const net = await import("net");
    assert(this.socketPath);

    // First, wait for the socket file to be created by nvim
    const socketFileStartTime = Date.now();
    while (!existsSync(this.socketPath)) {
      if (Date.now() - socketFileStartTime > timeoutMs) {
        throw new Error(
          `Socket file was not created within ${timeoutMs}ms: ${this.socketPath}`,
        );
      }
      await sleep(100);
    }

    console.debug(`[NeovimClient] Socket file created: ${this.socketPath}`);

    // Now connect to the socket
    return new Promise<void>((resolve, reject) => {
      assert(this.socketPath);
      const socket = net.createConnection(this.socketPath);
      let timeoutId: Timer | null = null;

      const onConnect = () => {
        if (timeoutId) clearTimeout(timeoutId);
        socket.removeListener("error", onError);
        this.socket = socket;
        this.setupSocketListeners();
        console.debug(`[NeovimClient] Connected to socket: ${this.socketPath}`);
        resolve();
      };

      const onError = (err: Error) => {
        if (timeoutId) clearTimeout(timeoutId);
        socket.removeListener("connect", onConnect);
        console.error(`[NeovimClient] Socket connection error:`, err);
        reject(new Error(`Socket connection error: ${err.message}`));
      };

      socket.on("connect", onConnect);
      socket.on("error", onError);

      timeoutId = setTimeout(() => {
        socket.removeListener("connect", onConnect);
        socket.removeListener("error", onError);
        socket.destroy();
        reject(new Error(`Connection timeout to ${this.socketPath}`));
      }, timeoutMs);
    });
  }

  private setupSocketListeners(): void {
    this.socket.on("data", (chunk: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.decodeMessages();
    });

    this.socket.on("error", (error: Error) => {
      for (const [, pending] of this.pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(error);
      }
      this.pendingRequests.clear();
    });
  }

  private decodeMessages(): void {
    try {
      // Use unpackMultiple to decode all complete messages from the buffer
      const decoder = new Unpackr({ useRecords: false }) as any;
      const messages = decoder.unpackMultiple(this.buffer);

      // Handle each decoded message
      for (const message of messages) {
        this.handleMessage(message);
      }

      // Clear the buffer after successfully decoding messages
      if (messages.length > 0) {
        this.buffer = Buffer.alloc(0);
      }
    } catch (error) {
      // If it's an incomplete message error, keep the buffer for next time
      if ((error as any).message?.includes("Unexpected end")) {
        return;
      }
      // Any other error should be thrown
      throw error;
    }
  }

  private handleMessage(message: unknown): void {
    if (!Array.isArray(message)) {
      throw new Error(`Invalid message format: ${JSON.stringify(message)}`);
    }

    const [type] = message;

    // Type 1 = Response [1, id, error, result]
    if (type === 1) {
      const [, id, error, result] = message as [
        number,
        number,
        unknown,
        unknown,
      ];

      const pending = this.pendingRequests.get(id);
      if (!pending) {
        throw new Error(`Received response for unknown request id: ${id}`);
      }

      clearTimeout(pending.timeout);
      this.pendingRequests.delete(id);

      if (error) {
        // Format the error message to be more readable by replacing escaped newlines
        const paramsStr = JSON.stringify(pending.params);
        const errorStr = JSON.stringify(error);

        // Replace \n with actual newlines for better readability
        const formattedParams = paramsStr.replace(/\\n/g, "\n");
        const formattedError = errorStr.replace(/\\n/g, "\n");

        const errorMessage = `RPC Error in ${pending.method}(${formattedParams}): ${formattedError}`;
        pending.reject(new Error(errorMessage));
      } else {
        pending.resolve(result);
      }
    } else if (type === 2) {
      // Type 2 = Notification [2, method, params]
      const [, method, params] = message as [number, string, unknown[]];

      if (method === "log_message") {
        console.debug(`[Neovim RPC]: ${params[0]}`);
      } else {
        throw new Error(`[Neovim RPC] Unknown notification: ${method}`, {
          cause: params,
        });
      }
    } else {
      throw new Error(`Unsupported message type: ${type}`);
    }
  }

  async call(
    method: string,
    params: unknown[] = [],
    timeoutMs: number | null = 10000,
  ): Promise<unknown> {
    if (!this.socket) {
      throw new Error("Not connected to Neovim");
    }

    const id = ++this.rpcId;
    const request = [0, id, method, params];
    const encoded = this.packr.encode(request);

    return new Promise((resolve, reject) => {
      let timeout: Timer | null = null;

      if (timeoutMs !== null) {
        timeout = setTimeout(() => {
          this.pendingRequests.delete(id);
          reject(
            new Error(`RPC call timeout: ${method}(${JSON.stringify(params)})`),
          );
        }, timeoutMs);
      }

      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timeout!,
        method,
        params,
      });
      this.socket.write(encoded);
    });
  }

  async waitForUiClient(timeoutMs: number = 60000): Promise<void> {
    console.log(`\n🔌 Waiting for UI client to connect...`);
    console.log(
      `   Connect with: nvim --server ${this.socketPath} --remote-ui\n`,
    );

    const luaCode = `
      local success = vim.wait(${timeoutMs}, function()
        return #vim.api.nvim_list_uis() > 0
      end, 100)
      assert(success, 'Timeout waiting for UI client to attach')
      return true
    `;

    await this.call("nvim_exec_lua", [luaCode, []], null);
    console.log("✅ UI client connected!\n");
  }

  async waitForUiDisconnect(): Promise<void> {
    console.log("\n⏸️  Test finished. Close the nvim UI to continue...\n");

    while (true) {
      const uis = (await this.call("nvim_list_uis", [])) as unknown[];

      if (uis.length === 0) {
        console.log("✅ UI client disconnected, continuing...\n");
        return;
      }

      await sleep(500);
    }
  }

  async close(): Promise<void> {
    this.socket.destroy();

    assert(this.process);

    this.process.kill();
    await this.process.exited;
  }
}
