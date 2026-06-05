import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { HTTPException } from "hono/http-exception";
import sessionsRouter from "./routes/sessions";

const app = new Hono();

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message || "Request failed" }, error.status);
  }

  console.error("[server] Unhandled error:", error);

  return c.json({ error: "Internal server error" }, 500);
});

const routes = app.route("/sessions", sessionsRouter);

export type AppType = typeof routes;

const port = process.env["PORT"];

if (!port) {
  throw new Error("PORT is missing in the environment");
}

const server = serve({ fetch: app.fetch, port: Number(port) }, (info) => {
  console.log(`[server] Listening on http://localhost:${info.port}`);
});

server.setTimeout(255 * 1000);

function shutdown(signal: string) {
  console.log(`[server] Received ${signal}, shutting down...`);
  server.close((err) => {
    if (err) {
      console.error("[server] Error during shutdown:", err);
      process.exit(1);
    }

    console.log("[server] Shutdown complete.");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export default app;
