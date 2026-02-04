# mcp-build-verifier

Deterministic MCP server that executes build/test commands, captures logs, and reports the first relevant error (if any). It does not modify code or attempt fixes.

## Features

- MCP stdio server (TypeScript SDK)
- `run_build` tool for executing commands
- `analyze_logs` tool for conservative log parsing
- Neutral, deterministic, read-only behavior

## Requirements

- Node.js 18+

## Setup

```bash
npm install
npm run build
```

## Run (stdio)

```bash
npm start
```

## Using With Codex

Add the server to your Codex config (example for `~/.codex/config.toml`):

```toml
[mcp_servers.build_verifier]
command = "node"
args = ["/home/cicarulez/projects/mcp-build-verifier/dist/index.js"]

[mcp_servers.build_verifier.env]
MCP_TRANSPORT_TYPE = "stdio"
```

Then restart your Codex session so the tools are loaded.

## Recommended Flow (Agent)

The MCP server exposes two tools only:
1. `run_build`
2. `analyze_logs`

Recommended agent flow:
1. Call `run_build` with `command` and project `cwd`.
2. Pass `stdout` and `stderr` from the result to `analyze_logs`.
3. Use only the first error returned by `analyze_logs`.

## MCP Build Verification Flow (Example)

```text
# MCP Build Verification Flow

Run this verification flow after every task that changes code in this project.

1. Call the `run_build` tool with:
   - `command`: the build/test command (e.g., `npm run --workspace backend build` or `npm run --workspace frontend build`)
   - `cwd`: `/home/user/projects/Example-App`
2. Read `stdout` and `stderr` from the response.
3. Call `analyze_logs` passing `stdout` and `stderr`.
4. Use ONLY the first error returned by `analyze_logs` to decide next steps.

Notes:
- Do not suggest fixes unless explicitly asked.
- Do not modify files during the verification phase.
```

## Tools

### `run_build`

Input:

```json
{
  "command": "npm test",
  "cwd": "/path/to/project"
}
```

Output:

```json
{
  "stdout": "...",
  "stderr": "...",
  "exitCode": 0
}
```

### `analyze_logs`

Input:

```json
{
  "stdout": "...",
  "stderr": "..."
}
```

Output:

```json
{
  "success": false,
  "errors": [
    {
      "type": "typescript",
      "code": "TS2307",
      "file": "src/index.ts",
      "line": 10,
      "message": "Cannot find module ..."
    }
  ]
}
```

## Notes

- Parsing is best-effort and returns only the first relevant error.
- No fixes, retries, or file modifications are performed.
