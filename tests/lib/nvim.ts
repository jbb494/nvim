import { sleep, spawn } from "bun";
import { Packr } from "msgpackr";
import { mkdirSync, existsSync } from "fs";
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
  process: Bun.Subprocess<"ignore", "pipe", "pipe"> | null = null;
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
      stdio: ["ignore", "pipe", "pipe"],
    });

    // ✅ Correct way to read from Bun's streams
    const pipeStream = async (
      stream: ReadableStream,
      callback: (a: string) => void,
    ) => {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer = buffer + decoder.decode(value);
      }
      callback(buffer);
    };

    // Start listening without blocking the start method
    pipeStream(this.process.stderr, (s: string) => {
      if (
        s.startsWith("Nvim: Caught deadly signal 'SIGTERM'") ||
        s.startsWith("W325")
      ) {
        console.debug(s);
        return;
      }

      throw new Error(`[Neovim STDERR]: ${s}`);
    });

    pipeStream(this.process.stdout, (s) =>
      console.debug(`[Neovim STDOUT]: ${s}`),
    );

    await this.waitForConnection(15000);
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
    let offset = 0;

    while (offset < this.buffer.length) {
      try {
        const remaining = this.buffer.slice(offset);
        const decoder = this.packr as any;
        const decoded = decoder.unpack(remaining);

        const bytesRead = decoder.lastDecodeBytes || decoder.offset || 0;

        if (bytesRead === 0 || bytesRead === undefined) {
          break;
        }

        offset += bytesRead;
        this.handleMessage(decoded);
      } catch (error) {
        // If it's an incomplete message error, stop decoding
        if ((error as any).message?.includes("Unexpected end")) {
          break;
        }
        // Any other error should be thrown
        throw error;
      }
    }

    if (offset > 0) {
      this.buffer = this.buffer.slice(offset);
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
        const errorMessage = `RPC Error in ${pending.method}(${JSON.stringify(pending.params)}): ${JSON.stringify(error)}`;
        pending.reject(new Error(errorMessage));
      } else {
        pending.resolve(result);
      }
    } else {
      throw new Error(`Unsupported message type: ${type}`);
    }
  }

  async call(method: string, params: unknown[] = []): Promise<unknown> {
    if (!this.socket) {
      throw new Error("Not connected to Neovim");
    }

    const id = ++this.rpcId;
    const request = [0, id, method, params];
    const encoded = this.packr.encode(request);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          new Error(`RPC call timeout: ${method}(${JSON.stringify(params)})`),
        );
      }, 10000);

      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout,
        method,
        params,
      });
      this.socket.write(encoded);
    });
  }

  async close(): Promise<void> {
    this.socket.destroy();

    assert(this.process);

    this.process.kill();
    await this.process.exited;
  }
}
