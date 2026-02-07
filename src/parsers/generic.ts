import type { ParsedError } from "../tools/analyzeLogs.js";

const ERROR_LINE = /\b(error|failed|failure)\b/i;
const WARNING_LINE = /\bwarning\b/i;
const NON_FATAL_PATTERNS = [
  /^\[baseline-browser-mapping\]/i,
  /\bdeprecated\b/i,
  /\bexceeded maximum budget\b/i,
  /\brules skipped due to selector errors\b/i,
];

function isNonFatalLine(line: string): boolean {
  return NON_FATAL_PATTERNS.some((pattern) => pattern.test(line));
}

export function findGenericError(
  logs: string,
  options: { hasStderr: boolean; stderrLogs?: string }
): ParsedError | null {
  const lines = logs.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    if (WARNING_LINE.test(line)) continue;
    if (ERROR_LINE.test(line)) {
      return {
        type: "generic",
        code: null,
        file: null,
        line: null,
        message: line.trim(),
      };
    }
  }

  if (options.hasStderr && options.stderrLogs) {
    if (!ERROR_LINE.test(options.stderrLogs)) {
      return null;
    }
    const stderrLines = options.stderrLogs.split(/\r?\n/);
    const first = stderrLines.find((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (WARNING_LINE.test(trimmed)) return false;
      if (isNonFatalLine(trimmed)) return false;
      return true;
    });
    if (first) {
      return {
        type: "generic",
        code: null,
        file: null,
        line: null,
        message: first.trim(),
      };
    }
  }

  return null;
}
