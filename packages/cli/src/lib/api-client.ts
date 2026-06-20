import { hc } from "hono/client";
import type { AppType } from "@writ/server";
import { clearAuthToken, getAuthToken } from "./auth-token-store";

const apiBaseUrl =
  process.env["API_BASE_URL"] ?? "https://writ-server-k1sb.onrender.com";

const apiClient = hc<AppType>(apiBaseUrl, {
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
