import type { ParsedError } from "../tools/analyzeLogs.js";

const ANGULAR_TSC_ERROR = /ERROR in (.*):(\d+):(\d+)\s*-\s*error\s*(TS\d+):\s*(.*)/;
const ANGULAR_ERROR = /^ERROR in (.*)$/;
const TEMPLATE_ERROR = /Error occurs in the template of component\s+([A-Za-z0-9_]+)\.?/;
const FILE_LINE_COL = /^\s*(\S+):(\d+):(\d+):?/;
const CODE_HINT = /\b(NG\d+|TS\d+)\b/;

export function findAngularError(logs: string): ParsedError | null {
  const lines = logs.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const templateMatch = lines[i]?.match(TEMPLATE_ERROR);
    if (!templateMatch) continue;

    const componentName = templateMatch[1] ?? "UnknownComponent";
    const { location: htmlLocation } = findNearestLocation(lines, i, {
      direction: "backward",
      preferredExts: [".html"],
    });
    const { location: tsLocation } = findNearestLocation(lines, i, {
      direction: "forward",
      preferredExts: [".ts", ".tsx"],
    });
    const code = findNearestCode(lines, i) ?? null;

    let message = lines[i]?.trim() || `Template error in ${componentName}.`;
    if (tsLocation) {
      message += ` Component: ${tsLocation.file}:${tsLocation.line}:${tsLocation.col}`;
    }

    return {
      type: "angular",
      code,
      file: htmlLocation?.file ?? tsLocation?.file ?? null,
      line: htmlLocation?.line ?? tsLocation?.line ?? null,
      message,
    };
  }

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

type Location = { file: string; line: number | null; col: number | null };

function findNearestLocation(
  lines: string[],
  startIndex: number,
  options: { direction: "backward" | "forward"; preferredExts: string[] },
): { location: Location | null } {
  const { direction, preferredExts } = options;
  const step = direction === "backward" ? -1 : 1;
  const start = direction === "backward" ? startIndex - 1 : startIndex + 1;
  const limit = direction === "backward" ? -1 : lines.length;

  let fallback: Location | null = null;
  for (let i = start; i !== limit; i += step) {
    const match = lines[i]?.match(FILE_LINE_COL);
    if (!match) continue;
    const file = match[1]?.trim();
    if (!file) continue;
    const line = Number.parseInt(match[2] ?? "", 10);
    const col = Number.parseInt(match[3] ?? "", 10);
    const location = {
      file,
      line: Number.isFinite(line) ? line : null,
      col: Number.isFinite(col) ? col : null,
    };
    if (preferredExts.some((ext) => file.endsWith(ext))) {
      return { location };
    }
    if (!fallback) fallback = location;
  }

  return { location: fallback };
}

function findNearestCode(lines: string[], startIndex: number): string | null {
  const scanLimit = 6;
  for (let offset = 0; offset <= scanLimit; offset += 1) {
    const back = lines[startIndex - offset];
    const forward = lines[startIndex + offset];
    const backMatch = back?.match(CODE_HINT);
    if (backMatch) return backMatch[1] ?? null;
    const forwardMatch = forward?.match(CODE_HINT);
    if (forwardMatch) return forwardMatch[1] ?? null;
  }
  return null;
}
