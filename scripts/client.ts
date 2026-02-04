import { spawn } from "node:child_process";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

const args = process.argv.slice(2);
const mode = args[0];

function usage(): never {
  const text = [
    "Usage:",
    "  npm run client -- list",
    "  npm run client -- run_build <command> <cwd>",
    "  npm run client -- analyze_logs <stdout> <stderr>",
    "  npm run client -- verify <command> <cwd>",
  ].join("\n");
  console.error(text);
  process.exit(1);
}

if (!mode) usage();

const server = spawn("node", ["dist/index.js"], {
  stdio: ["pipe", "pipe", "inherit"],
});

let nextId = 1;
const pending = new Map<number, (data: unknown) => void>();

server.stdout.setEncoding("utf8");
server.stdout.on("data", (chunk: string) => {
  const lines = chunk.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    try {
      const msg = JSON.parse(line);
      if (typeof msg?.id === "number" && pending.has(msg.id)) {
        pending.get(msg.id)?.(msg);
        pending.delete(msg.id);
      } else {
        console.log(JSON.stringify(msg, null, 2));
      }
    } catch {
      // Ignore non-JSON output.
    }
  }
});

function send(method: string, params?: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve) => {
    const id = nextId++;
    const payload: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };
    pending.set(id, resolve);
    server.stdin.write(`${JSON.stringify(payload)}\n`);
  });
}

function stripAnsi(input: string): string {
  return input
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\u001b\[[0-9;]*K/g, "");
}

async function main() {
  if (mode === "list") {
    const res = await send("tools/list", {});
    console.log(JSON.stringify(res, null, 2));
    server.kill();
    return;
  }

  if (mode === "run_build") {
    const command = args[1];
    const cwd = args[2];
    if (!command || !cwd) usage();
    const res = await send("tools/call", {
      name: "run_build",
      arguments: { command, cwd },
    });
    console.log(JSON.stringify(res, null, 2));
    server.kill();
    return;
  }

  if (mode === "analyze_logs") {
    const stdout = args[1] ?? "";
    const stderr = args[2] ?? "";
    const res = await send("tools/call", {
      name: "analyze_logs",
      arguments: { stdout, stderr },
    });
    console.log(JSON.stringify(res, null, 2));
    server.kill();
    return;
  }

  if (mode === "verify") {
    const command = args[1];
    const cwd = args[2];
    if (!command || !cwd) usage();
    const runRes = await send("tools/call", {
      name: "run_build",
      arguments: { command, cwd },
    });
    const content =
      typeof runRes === "object" && runRes !== null
        ? (runRes as any).result?.content?.[0]?.text
        : null;
    const parsed = content ? JSON.parse(content) : { stdout: "", stderr: "" };
    const cleanStdout = stripAnsi(parsed.stdout ?? "");
    const cleanStderr = stripAnsi(parsed.stderr ?? "");
    const analyzeRes = await send("tools/call", {
      name: "analyze_logs",
      arguments: { stdout: cleanStdout, stderr: cleanStderr },
    });
    console.log(JSON.stringify({ run: parsed, analyze: analyzeRes }, null, 2));
    server.kill();
    return;
  }

  usage();
}

main().catch((err) => {
  console.error(err);
  server.kill();
  process.exit(1);
});
