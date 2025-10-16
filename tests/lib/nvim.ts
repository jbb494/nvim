import { spawn, type ChildProcess } from "bun";
import { Packr } from "msgpackr";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: Timer;
}

export class NeovimClient {
  process: ChildProcess | null = null;
  private socket: any = null;
  private packr = new Packr({ useRecords: false });
  private rpcId = 0;
  private pendingRequests = new Map<number, PendingRequest>();
  private buffer = Buffer.alloc(0);
  private port: number;

  constructor(port: number = 6666) {
    this.port = port;
  }

  async start(workingDir: string, configPath?: string): Promise<void> {
    const args = [
      "--listen",
      `127.0.0.1:${this.port}`,
      "--headless",
      "--noplugin",
      "-u",
      configPath || "NONE",
    ];

    this.process = spawn({
      cmd: ["nvim", ...args],
      cwd: workingDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    await this.waitForConnection(15000);
  }

  private async waitForConnection(timeoutMs: number): Promise<void> {
    const net = await import("net");

    return new Promise<void>((resolve, reject) => {
      const socket = net.createConnection(this.port, "127.0.0.1");
      let timeoutId: Timer | null = null;

      const onConnect = () => {
        if (timeoutId) clearTimeout(timeoutId);
        socket.removeListener("error", onError);
        this.socket = socket;
        this.setupSocketListeners();
        resolve();
      };

      const onError = (err: Error) => {
        if (timeoutId) clearTimeout(timeoutId);
        socket.removeListener("connect", onConnect);
        reject(err);
      };

      socket.on("connect", onConnect);
      socket.on("error", onError);

      timeoutId = setTimeout(() => {
        socket.removeListener("connect", onConnect);
        socket.removeListener("error", onError);
        socket.destroy();
        reject(new Error("Connection timeout"));
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
        pending.reject(new Error(`RPC Error: ${JSON.stringify(error)}`));
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
        reject(new Error(`RPC call timeout: ${method}`));
      }, 10000);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.socket.write(encoded);
    });
  }

  async close(): Promise<void> {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    if (this.process) {
      this.process.kill();
    }
  }
}
