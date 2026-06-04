import { config } from "dotenv";
import { resolve } from "node:path";
import { hc } from "hono/client";
import type { AppType } from "@writ/server";

config({ path: resolve(import.meta.dirname, "../../../../.env") });

const apiBaseUrl = process.env["API_BASE_URL"];

if (!apiBaseUrl) {
  throw new Error("API_BASE_URL is missing in the environment");
}

const apiClient = hc<AppType>(apiBaseUrl);

export default apiClient;
