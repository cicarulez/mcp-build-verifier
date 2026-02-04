import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { runBuild } from "./tools/runBuild.js";
import { analyzeLogs } from "./tools/analyzeLogs.js";

const server = new Server(
  {
    name: "mcp-build-verifier",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const RunBuildSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().min(1),
});

const AnalyzeLogsSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "run_build",
        description: "Execute a build/test command and capture stdout/stderr.",
        inputSchema: {
          type: "object",
          properties: {
            command: { type: "string" },
            cwd: { type: "string" },
          },
          required: ["command", "cwd"],
          additionalProperties: false,
        },
      },
      {
        name: "analyze_logs",
        description: "Analyze logs and extract the first relevant error.",
        inputSchema: {
          type: "object",
          properties: {
            stdout: { type: "string" },
            stderr: { type: "string" },
          },
          required: ["stdout", "stderr"],
          additionalProperties: false,
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "run_build") {
    const { command, cwd } = RunBuildSchema.parse(request.params.arguments);
    const result = await runBuild({ command, cwd });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  }

  if (request.params.name === "analyze_logs") {
    const { stdout, stderr } = AnalyzeLogsSchema.parse(request.params.arguments);
    const result = analyzeLogs({ stdout, stderr });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ error: "Unknown tool" }),
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
