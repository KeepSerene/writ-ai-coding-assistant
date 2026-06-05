import * as Sentry from "@sentry/hono/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { consoleIntegration } from "@sentry/node";

const sentryDsn = process.env["SENTRY_DSN"];
const isProd = process.env["NODE_ENV"] === "production";

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [nodeProfilingIntegration(), consoleIntegration()],
    tracesSampleRate: parseFloat(
      process.env["SENTRY_TRACES_SAMPLE_RATE"] ?? (isProd ? "0.2" : "1.0"),
    ),
    profileSessionSampleRate: parseFloat(
      process.env["SENTRY_PROFILES_SAMPLE_RATE"] ?? (isProd ? "0.2" : "1.0"),
    ),
    profileLifecycle: "trace",
    enableLogs: true,
    sendDefaultPii:
      process.env["SENTRY_SEND_DEFAULT_PII"] === "true" || !isProd,
  } as any);

  console.log(
    `[sentry] Initialized successfully. (Mode: ${isProd ? "Production" : "Development"})`,
  );
} else {
  console.warn("[sentry] SENTRY_DSN is missing, skipping initialization.");
}
