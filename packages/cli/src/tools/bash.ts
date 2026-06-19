import { spawn } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_LENGTH = 20_000;

export default async function executeBash(
  cwd: string,
  command: string,
  timeout: number = DEFAULT_TIMEOUT_MS,
) {
  return new Promise((resolve) => {
    try {
      const proc = spawn("bash", ["-c", command], {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, TERM: "dumb" },
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });

      const timer = setTimeout(() => {
        proc.kill("SIGTERM");
      }, timeout);

      proc.on("close", (code) => {
        clearTimeout(timer);

        const truncate = (str: string) =>
          str.length > MAX_OUTPUT_LENGTH
            ? str.slice(0, MAX_OUTPUT_LENGTH) +
              `\n... (truncated, ${str.length} total chars)`
            : str;

        resolve({
          stdout: truncate(stdout),
          stderr: truncate(stderr),
          exitCode: code ?? 1, // null means killed by signal; treat as failure
        });
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        resolve({ error: `Failed to spawn process: ${err.message}` });
      });
    } catch (error) {
      console.error("Error in bash tool:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      resolve({ error: `Failed to execute bash command: ${errMsg}` });
    }
  });
}
