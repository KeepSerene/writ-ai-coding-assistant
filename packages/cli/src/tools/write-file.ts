import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export default async function executeWriteFile(
  resolvedPath: string,
  relativePath: string,
  content: string,
) {
  try {
    await mkdir(dirname(resolvedPath), { recursive: true });
    await writeFile(resolvedPath, content, "utf-8");

    return {
      success: true as const,
      path: relativePath,
      bytesWritten: Buffer.byteLength(content, "utf-8"),
    };
  } catch (error) {
    console.error("Error in writeFile tool:", error);
    const errMsg = error instanceof Error ? error.message : String(error);

    return {
      error: `Failed to write file at ${relativePath}. System detail: ${errMsg}`,
    };
  }
}
