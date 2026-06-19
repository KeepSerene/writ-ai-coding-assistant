import { relative, resolve } from "node:path";
import { glob } from "node:fs/promises";

const MAX_RESULTS = 200;

export default async function executeGlob(
  pattern: string,
  cwd: string,
  resolvedPath: string,
) {
  try {
    const files: string[] = [];
    let isTruncated = false;

    const stream = glob(pattern, {
      cwd: resolvedPath,
      exclude: (p: string) => p.includes("node_modules") || p.includes(".git"),
    });

    for await (const match of stream) {
      if (files.length >= MAX_RESULTS) {
        isTruncated = true;
        break;
      }

      const absoluteMatch = resolve(resolvedPath, match);
      files.push(relative(cwd, absoluteMatch));
    }

    files.sort();

    return {
      files,
      ...(isTruncated ? { truncated: true } : {}),
    };
  } catch (error) {
    console.error("Error in glob tool:", error);
    const errMsg = error instanceof Error ? error.message : String(error);

    return {
      error: `Failed to search files: ${errMsg}`,
    };
  }
}
