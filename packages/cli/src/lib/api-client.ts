import { config } from "dotenv";
import { resolve } from "node:path";
import { hc } from "hono/client";
import type { AppType } from "@writ/server";
import { clearAuthToken, getAuthToken } from "./auth-token-store";

config({ path: resolve(import.meta.dirname, "../../../../.env") });

const apiBaseUrl = process.env["API_BASE_URL"];

if (!apiBaseUrl) {
  throw new Error("API_BASE_URL is missing in the environment");
}

const apiClient = hc<AppType>(apiBaseUrl!, {
  fetch: async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => {
    const headers = new Headers(init?.headers);
    const auth = getAuthToken();

    if (auth) {
      headers.set("Authorization", `Bearer ${auth.token}`);
    }

    const response = await fetch(input, { ...init, headers });

    if (response.status === 401) {
      clearAuthToken();
    }

    return response;
  },
});

export default apiClient;
