import { spawn } from "node:child_process";

export type RunBuildInput = {
  command: string;
  cwd: string;
};

export type RunBuildOutput = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export function runBuild({ command, cwd }: RunBuildInput): Promise<RunBuildOutput> {
  return new Promise((resolve) => {
    let resolved = false;
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (err: Error) => {
      if (resolved) return;
      resolved = true;
      const message = err?.message ? `${err.message}\n` : "";
      resolve({
        stdout,
        stderr: `${stderr}${message}`,
        exitCode: 1,
      });
    });

    child.on("close", (code: number | null) => {
      if (resolved) return;
      resolved = true;
      resolve({
        stdout,
        stderr,
        exitCode: typeof code === "number" ? code : 0,
      });
    });
  });
}
