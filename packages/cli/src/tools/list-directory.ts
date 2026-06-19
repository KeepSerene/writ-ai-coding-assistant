import { readdir } from "node:fs/promises";

export default async function executeListDirectory(
  resolvedPath: string,
  relativePath: string,
) {
  try {
    const entries = await readdir(resolvedPath, { withFileTypes: true });
    const result: { name: string; type: "file" | "directory" }[] = [];

    for (const entry of entries) {
      // Skip hidden files/directories and dependency folders
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

      result.push({
        name: entry.name,
        type: entry.isDirectory() ? "directory" : "file",
      });
    }

    // Sort: directories first, then alphabetical
    result.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;

      return a.name.localeCompare(b.name);
    });

    return {
      path: relativePath,
      entries: result,
    };
  } catch (error) {
    console.error("Error in listDirectory tool:", error);

    const err = error as NodeJS.ErrnoException;

    if (err.code === "ENOENT") {
      return { error: `Directory not found at path: ${relativePath}` };
    }

    if (err.code === "ENOTDIR") {
      return {
        error: `Path is a file, not a directory: ${relativePath}. Use readFile instead.`,
      };
    }

    const errMsg = error instanceof Error ? error.message : String(error);

    return {
      error: `Failed to list directory at ${relativePath}. System detail: ${errMsg}`,
    };
  }
}
