import type { ParsedError } from "../tools/analyzeLogs.js";

const TSC_PAREN_ERROR = /^(.+?)\((\d+),(\d+)\):\s*error\s*(TS\d+):\s*(.*)$/;
const TSC_COLON_ERROR = /^(.+?):(\d+):(\d+)\s*-\s*error\s*(TS\d+):\s*(.*)$/;
const TSC_GLOBAL_ERROR = /error\s*(TS\d+):\s*(.*)/;

export function findTypeScriptError(logs: string): ParsedError | null {
  const lines = logs.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(TSC_PAREN_ERROR);
    if (match) {
      return {
        type: "typescript",
        code: match[4] ?? null,
        file: match[1]?.trim() || null,
        line: Number.parseInt(match[2] ?? "", 10) || null,
        message: match[5]?.trim() || line.trim(),
      };
    }
  }

  for (const line of lines) {
    const match = line.match(TSC_COLON_ERROR);
    if (match) {
      return {
        type: "typescript",
        code: match[4] ?? null,
        file: match[1]?.trim() || null,
        line: Number.parseInt(match[2] ?? "", 10) || null,
        message: match[5]?.trim() || line.trim(),
      };
    }
  }

  for (const line of lines) {
    const match = line.match(TSC_GLOBAL_ERROR);
    if (match) {
      return {
        type: "typescript",
        code: match[1] ?? null,
        file: null,
        line: null,
        message: match[2]?.trim() || line.trim(),
      };
    }
  }

  return null;
}
