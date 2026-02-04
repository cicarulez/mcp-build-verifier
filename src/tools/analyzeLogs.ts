import { findAngularError } from "../parsers/angular.js";
import { findTypeScriptError } from "../parsers/typescript.js";
import { findGenericError } from "../parsers/generic.js";

export type AnalyzeLogsInput = {
  stdout: string;
  stderr: string;
};

export type ParsedError = {
  type: string;
  code: string | null;
  file: string | null;
  line: number | null;
  message: string;
};

export type AnalyzeLogsOutput = {
  success: boolean;
  errors: ParsedError[];
};

export function analyzeLogs({ stdout, stderr }: AnalyzeLogsInput): AnalyzeLogsOutput {
  const normalizedStdout = stripAnsi(stdout);
  const normalizedStderr = stripAnsi(stderr);
  const normalizedCombined = [normalizedStderr, normalizedStdout].filter(Boolean).join("\n");

  const angular = findAngularError(normalizedCombined);
  if (angular) {
    return { success: false, errors: [angular] };
  }

  const ts = findTypeScriptError(normalizedCombined);
  if (ts) {
    return { success: false, errors: [ts] };
  }

  const generic = findGenericError(normalizedCombined, {
    hasStderr: Boolean(stderr),
    stderrLogs: normalizedStderr,
  });
  if (generic) {
    return { success: false, errors: [generic] };
  }

  return { success: true, errors: [] };
}

function stripAnsi(input: string): string {
  return input
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\u001b\[[0-9;]*K/g, "");
}
