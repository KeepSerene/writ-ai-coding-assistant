import { Hono } from "hono";
import type { AuthenticatedEnv } from "../middlewares/require-auth";
import { generateCheckoutUrl, generateCustomerPortalUrl } from "../lib/polar";

const billingRouter = new Hono<AuthenticatedEnv>()
  .post("/checkout", async (c) => {
    const userId = c.get("userId");

    return c.json({
      url: await generateCheckoutUrl({
        reqUrl: c.req.url,
        externalCustomerId: userId,
      }),
    });
  })
  .post("/portal", async (c) => {
    const userId = c.get("userId");
    const portalUrl = await generateCustomerPortalUrl({
      reqUrl: c.req.url,
      externalCustomerId: userId,
    });

    // Handle the expected "No Purchase Yet" null return
    if (!portalUrl) {
      return c.json(
        { error: "No billing profile found. Run /upgrade to make a purchase." },
        404,
      );
    }

    return c.json({ url: portalUrl });
  })
  .get("/success", (c) =>
    c.text(
      "Payment successful! You can close this tab and return to Writ now.",
    ),
  );

export default billingRouter;
