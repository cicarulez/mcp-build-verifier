import type { ParsedError } from "../tools/analyzeLogs.js";

const ANGULAR_TSC_ERROR = /ERROR in (.*):(\d+):(\d+)\s*-\s*error\s*(TS\d+):\s*(.*)/;
const ANGULAR_ERROR = /^ERROR in (.*)$/;

export function findAngularError(logs: string): ParsedError | null {
  const lines = logs.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(ANGULAR_TSC_ERROR);
    if (match) {
      return {
        type: "angular",
        code: match[4] ?? null,
        file: match[1]?.trim() || null,
        line: Number.parseInt(match[2] ?? "", 10) || null,
        message: match[5]?.trim() || line.trim(),
      };
    }
  }

  for (const line of lines) {
    const match = line.match(ANGULAR_ERROR);
    if (match) {
      return {
        type: "angular",
        code: null,
        file: match[1]?.trim() || null,
        line: null,
        message: line.trim(),
      };
    }
  }

  return null;
}
