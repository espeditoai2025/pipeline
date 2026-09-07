import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  user: vi.fn(),
  key: vi.fn(),
  price: vi.fn(),
  org: vi.fn(),
  checkout: vi.fn(),
  previous: vi.fn(),
  update: vi.fn(),
  customer: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: m.user },
    apiKey: { findUnique: m.key, update: vi.fn(async () => ({})) },
    organization: { findUnique: m.org },
    $transaction: m.transaction,
  },
}));
vi.mock("@/lib/rate-limit", () => ({ withApiKeyRateLimit: vi.fn(async () => null) }));
vi.mock("@/lib/stripe", () => ({
  STRIPE_PRO_PRICE_ID: "price-pro",
  APP_URL: "https://example.test",
  getStripe: () => ({
    prices: { retrieve: m.price },
    checkout: { sessions: { create: m.checkout, retrieve: m.previous } },
    customers: { create: m.customer },
  }),
}));
import { authenticateApiKey } from "@/lib/api-auth";
import { checkFeature, getLimits } from "@/lib/plan";
import { getTier } from "@/lib/plan-client";
import { crmPermissionError } from "@/lib/crm-permissions";
import { POST as checkout } from "@/app/api/stripe/checkout/route";
const session = {
  expires: "2099-01-01T00:00:00Z",
  user: { id: "u", organizationId: "org", role: "OWNER" },
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("STRIPE_SECRET_KEY", "test-key");
  m.auth.mockResolvedValue(session);
  m.user.mockResolvedValue({ organizationId: "org", role: "OWNER" });
  m.key.mockResolvedValue({ id: "key", organizationId: "org", createdBy: "u", expiresAt: null });
  m.org.mockResolvedValue({
    id: "org",
    name: "Studio",
    plan: "STARTER",
    stripeCustomerId: "cus",
    stripeSubscriptionId: null,
    stripeCheckoutSessionId: null,
  });
  m.price.mockResolvedValue({
    active: true,
    currency: "eur",
    unit_amount: 2900,
    recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
  });
  m.checkout.mockResolvedValue({ id: "cs", url: "https://checkout.stripe.com/test" });
  m.transaction.mockImplementation(async (callback) =>
    callback({ $queryRaw: vi.fn(), organization: { findUnique: m.org, update: m.update } }),
  );
});
afterEach(() => vi.unstubAllEnvs());
describe("permessi attuali e piani coerenti", () => {
  it.each(["VIEWER", "SALES", "MANAGER"])(
    "nega le API a una chiave creata da un utente ora %s",
    async (role) => {
      m.user.mockResolvedValue({ organizationId: "org", role });
      const response = await authenticateApiKey(
        new NextRequest("http://localhost/api/v1/contacts", {
          headers: { authorization: "Bearer pip_live_test" },
        }),
      );
      expect(response).toHaveProperty("status", 403);
    },
  );
  it("nega le mutazioni se l'utente è stato spostato o declassato dopo il login", async () => {
    m.user.mockResolvedValue({ organizationId: "other", role: "OWNER" });
    expect(await crmPermissionError(session)).toBeTruthy();
    m.user.mockResolvedValue({ organizationId: "org", role: "VIEWER" });
    expect(await crmPermissionError(session)).toBeTruthy();
    m.user.mockResolvedValue({ organizationId: "org", role: "SALES" });
    expect(await crmPermissionError(session)).toBeNull();
    expect(await crmPermissionError(session, "manage")).toBeTruthy();
  });
  it.each(["ESSENTIAL", "ADVANCED", "PROFESSIONAL", "PRO"])(
    "riconosce %s come Pro su client e server",
    (plan) => {
      expect(getTier(plan)).toBe("pro");
      expect(getLimits(plan)).toMatchObject({
        automations: true,
        smtp: true,
        maxContacts: null,
        emailCampaigns: true,
      });
    },
  );
  it("Starter mantiene i limiti pubblicati e la ricerca Lead Finder disponibile", () => {
    expect(getLimits("FREE")).toEqual(getLimits("STARTER"));
    expect(getLimits("STARTER")).toMatchObject({
      maxContacts: 500,
      maxPipelines: 1,
      automations: false,
      smtp: false,
      ai: false,
      emailCampaigns: false,
      leadFinderPerDay: 1,
      leadFinderMaxResults: 10,
    });
    expect(checkFeature("STARTER", "leadFinderPerDay")).toBeNull();
  });
});
describe("checkout", () => {
  it.each([
    { unit_amount: 9900 },
    { currency: "usd" },
    { recurring: { interval: "year", interval_count: 1 } },
    { active: false },
  ])("blocca prezzi diversi da quello pubblicato: %j", async (patch) => {
    m.price.mockResolvedValue({ ...(await m.price()), ...patch });
    expect((await checkout()).status).toBe(503);
    expect(m.checkout).not.toHaveBeenCalled();
  });
  it("riutilizza il checkout aperto e non crea sessioni duplicate", async () => {
    m.org.mockResolvedValue({ ...(await m.org()), stripeCheckoutSessionId: "existing" });
    m.previous.mockResolvedValue({ status: "open", url: "https://checkout.stripe.com/existing" });
    expect(await (await checkout()).json()).toMatchObject({
      url: "https://checkout.stripe.com/existing",
    });
    expect(m.checkout).not.toHaveBeenCalled();
  });
  it("usa una chiave idempotente e salva il checkout nel database", async () => {
    expect((await checkout()).status).toBe(200);
    expect(m.checkout).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price-pro", quantity: 1 }],
        success_url: "https://example.test/billing?upgraded=1",
      }),
      { idempotencyKey: "pipely-checkout-org-first" },
    );
    expect(m.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stripeCustomerId: "cus", stripeCheckoutSessionId: "cs" } }),
    );
  });
  it("non addebita nuovamente piani manuali o legacy", async () => {
    m.org.mockResolvedValue({ ...(await m.org()), plan: "ESSENTIAL" });
    expect((await checkout()).status).toBe(409);
    expect(m.checkout).not.toHaveBeenCalled();
  });
});
