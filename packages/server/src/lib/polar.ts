import { Polar } from "@polar-sh/sdk";

type PolarServerEnv = "production" | "sandbox";

function getEnvVar(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`[polar] ${name} is missing in the environment`);
  }

  return value;
}

const getStarterPackId = () => getEnvVar("POLAR_STARTER_PACK_ID");

const getProPackId = () => getEnvVar("POLAR_PRO_PACK_ID");

const getPowerPackId = () => getEnvVar("POLAR_POWER_PACK_ID");

const getTokensMeterId = () => getEnvVar("POLAR_TOKENS_METER_ID");

function getPolarServerEnv(): PolarServerEnv {
  const value = process.env["POLAR_SERVER_ENVIRONMENT"];

  if (!value) return "sandbox";

  if (value !== "production" && value !== "sandbox") {
    throw new Error(
      "POLAR_SERVER_ENVIRONMENT must either be 'production' or 'sandbox'",
    );
  }

  return value;
}

const polar = new Polar({
  accessToken: getEnvVar("POLAR_ACCESS_TOKEN"),
  server: getPolarServerEnv(),
});

interface GenerateCheckoutUrlParams {
  reqUrl: string;
  externalCustomerId: string;
}

export async function generateCheckoutUrl({
  reqUrl,
  externalCustomerId,
}: GenerateCheckoutUrlParams) {
  const response = await polar.checkouts.create({
    products: [getStarterPackId(), getProPackId(), getPowerPackId()],
    externalCustomerId,
    successUrl: new URL("/billing/success", reqUrl).toString(),
    metadata: { source: "writ-cli" },
  });

  return response.url;
}

function hasStatusCode(
  error: unknown,
): error is { statusCode?: number; status?: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    ("statusCode" in error || "status" in error)
  );
}

interface GenerateCustomerPortalUrlParams {
  reqUrl: string;
  externalCustomerId: string;
}

export async function generateCustomerPortalUrl({
  reqUrl,
  externalCustomerId,
}: GenerateCustomerPortalUrlParams) {
  try {
    const session = await polar.customerSessions.create({
      externalCustomerId,
      // Sets the "Return to app" button in the Polar Portal to redirect back to your base URL
      returnUrl: new URL("/", reqUrl).toString(),
    });

    return session.customerPortalUrl;
  } catch (error) {
    if (hasStatusCode(error)) {
      const code = error.statusCode ?? error.status;

      // 404 means the user has never made a purchase and doesn't exist in Polar yet
      if (code === 404) {
        return null;
      }
    }

    // Let unexpected API crashes bubble up to Hono and Sentry
    throw error;
  }
}

export async function getAvailableMeterTokens(externalCustomerId: string) {
  try {
    const customerState = await polar.customers.getStateExternal({
      externalId: externalCustomerId,
    });
    const matchingMeters = customerState.activeMeters.filter(
      (meter) => meter.meterId === getTokensMeterId(),
    );

    if (matchingMeters.length > 1) {
      throw new Error("Expected exactly one matching Polar tokens meter");
    }

    const tokensMeter = matchingMeters[0];

    return tokensMeter?.balance ?? 0;
  } catch (error) {
    if (hasStatusCode(error)) {
      const code = error.statusCode ?? error.status;

      // Safe 404: User just hasn't purchased yet
      if (code === 404) {
        return 0;
      }
    }

    console.error("Failed to fetch available meter tokens:", error);

    throw error;
  }
}

interface IngestTokenUsageParams {
  externalCustomerId: string;
  eventId: string;
  amount: number;
  status: "completed" | "interrupted";
}

export async function ingestTokenUsage({
  eventId,
  externalCustomerId,
  amount,
  status,
}: IngestTokenUsageParams) {
  if (amount === 0) return;

  await polar.events.ingest({
    events: [
      {
        name: "consumed_tokens",
        externalId: eventId,
        externalCustomerId,
        metadata: { amount, status },
      },
    ],
  });
}
