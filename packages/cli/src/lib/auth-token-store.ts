import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface StoredAuthToken {
  token: string;
}

// ~/.writ/auth.json — stored with tight permissions so other OS users can't read it
const TOKEN_DIR = join(homedir(), ".writ");
const TOKEN_FILE = join(TOKEN_DIR, "auth.json");

export function saveAuthToken(data: StoredAuthToken): void {
  if (!existsSync(TOKEN_DIR)) {
    mkdirSync(TOKEN_DIR, { mode: 0o700 }); // owner read/write/execute only
  }

  writeFileSync(TOKEN_FILE, JSON.stringify(data), { mode: 0o600 }); // owner read/write only
}

export function getAuthToken(): StoredAuthToken | null {
  try {
    const raw = readFileSync(TOKEN_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<StoredAuthToken>;

    return typeof parsed.token === "string" ? { token: parsed.token } : null;
  } catch (error) {
    console.error("Failed to get auth token:", error);

    return null;
  }
}

// Log out
export function clearAuthToken(): void {
  try {
    unlinkSync(TOKEN_FILE);
  } catch (error) {
    // File doesn't exist — that's fine
    console.error("Failed to clear auth token:", error);
  }
}
