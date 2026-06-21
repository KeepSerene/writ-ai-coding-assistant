import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { HTTPException } from "hono/http-exception";
import { sentry } from "@sentry/hono/node";
import * as Sentry from "@sentry/hono/node";
import { join } from "node:path";
import type { Server as HttpServer } from "node:http";
import landingPageHtml from "./views/landing";
import sessionsRouter from "./routes/sessions";
import chatRouter from "./routes/chat";
import oAuthCallbackRouter from "./routes/oauth-callback";
import { requireAuth } from "./middlewares/require-auth";
import billingRouter from "./routes/billing";
import { readFileSync } from "node:fs";

const isProd = process.env["NODE_ENV"] === "production";

const app = new Hono();

// Sentry middleware
app.use(sentry(app));

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    Sentry.logger.warn("Handled HTTP error", {
      status: error.status,
      message: error.message || "Request failed",
      path: c.req.path,
      method: c.req.method,
    });

    return c.json({ error: error.message || "Request failed" }, error.status);
  }

  Sentry.logger.error("Unhandled server error", {
    message: error instanceof Error ? error.message : "Unknown error",
    path: c.req.path,
    method: c.req.method,
  });
  console.error("[server] Unhandled error:", error);

  return c.json({ error: "Internal server error" }, 500);
});

// Sentry verification route (optional)
app.get("/debug-sentry", (_c) => {
  Sentry.logger.info("User triggered test error", {
    action: "test_error_endpoint",
  });
  Sentry.metrics.count("test_counter", 1);

  throw new Error("My first Sentry error!");
});

// Serve the logo
const logoWebp = readFileSync(
  join(import.meta.dirname, "../../assets/logo.webp"),
);

app.get("/assets/logo.webp", (c) => {
  return c.body(logoWebp, 200, {
    "Content-Type": "image/webp",
    "Cache-Control": "public, max-age=86400", // Cache it for 1 day
  });
});

// Serve the favicon
const faviconSvg = readFileSync(
  join(import.meta.dirname, "../../assets/favicon.svg"),
);

app.get("/favicon.svg", (c) => {
  return c.body(faviconSvg, 200, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=86400", // Cache it for 1 day
  });
});

// Root route
app.get("/", (c) => c.html(landingPageHtml));

// Health check route (for Render.com)
app.get("/healthz", (c) => c.json({ status: "ok" }));

// Middlewares
app.use("/sessions", requireAuth);
app.use("/sessions/*", requireAuth);
app.use("/billing/checkout", requireAuth);
app.use("/billing/portal", requireAuth);

// App routes
const routes = app
  .route("/auth", oAuthCallbackRouter)
  .route("/sessions", sessionsRouter)
  .route("/sessions/:sessionId/chat", chatRouter)
  .route("/billing", billingRouter);

export type AppType = typeof routes;

const port = Number(process.env["PORT"] ?? 3000);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[server] Listening on http://localhost:${info.port}`);
});

server.setTimeout(255 * 1000); // 255 secs

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[server] Port ${port} is already in use — is a previous instance still shutting down?`,
    );
  } else {
    console.error("[server] Server error:", err);
  }

  process.exit(1);
});

function closeAllConnections() {
  (server as HttpServer).closeAllConnections();
}

function shutdown(signal: string) {
  console.log(`[server] Received ${signal}, shutting down...`);

  if (isProd) {
    setTimeout(() => closeAllConnections(), 5000).unref();
  } else {
    closeAllConnections();
  }

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
