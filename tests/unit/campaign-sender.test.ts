import { beforeEach, describe, expect, it, vi } from "vitest";

// Verifica il nucleo dell'invio campagne: claim atomico, scelta del canale e
// soprattutto il registro per destinatario, che impedisce di riscrivere a chi ha
// gia' ricevuto quando un invio interrotto viene ripreso.
type Delivery = { campaignId: string; contactId: string };

const state = vi.hoisted(() => ({
  campaign: {
    id: "cmp_1",
    organizationId: "org_1",
    status: "DRAFT" as string,
    subject: "Novita di primavera",
    body: "Ciao {{nome}}, guarda <a href=\"https://esempio.it/offerte\">le offerte</a>.",
    fromName: "Rossi Srl",
    listId: "lst_1",
    totalSent: 0,
    sentAt: null as Date | null,
  },
  contacts: [
    { id: "c1", email: "uno@esempio.it", firstName: "Anna", lastName: "Bianchi", unsubscribed: false },
    { id: "c2", email: "due@esempio.it", firstName: "Luca", lastName: null, unsubscribed: false },
    { id: "c3", email: "tre@esempio.it", firstName: "Mara", lastName: "Verdi", unsubscribed: true },
  ],
  deliveries: [] as Delivery[],
  channel: "resend" as "smtp" | "resend" | null,
  sendFails: new Set<string>(),
  sentTo: [] as string[],
  lastHtml: "",
  lastFromName: undefined as string | undefined,
}));

vi.mock("@/lib/mailer", () => ({
  resolveOrgChannel: async () => state.channel,
  sendOrgMail: async (_orgId: string, opts: { to: string; html: string; fromName?: string }) => {
    if (state.sendFails.has(opts.to)) return { ok: false as const, error: "550 rifiutato" };
    state.sentTo.push(opts.to);
    state.lastHtml = opts.html;
    state.lastFromName = opts.fromName;
    return { ok: true as const, via: "resend" as const };
  },
}));
vi.mock("@/lib/logger", () => ({ logger: { error: () => {}, warn: () => {}, info: () => {} } }));
vi.mock("@/lib/plan", () => ({ getOrgPlan: async () => "PRO", checkFeature: () => null }));
vi.mock("@/lib/db", () => ({
  db: {
    emailCampaign: {
      // Claim atomico: passa a SENDING solo se lo stato è ancora fra quelli ammessi.
      updateMany: async ({ where, data }: { where: { id: string; status?: { in: string[] } }; data: { status: string } }) => {
        const ok = where.id === state.campaign.id && (!where.status || where.status.in.includes(state.campaign.status));
        if (ok) state.campaign.status = data.status;
        return { count: ok ? 1 : 0 };
      },
      findFirst: async () => ({ ...state.campaign, list: {
        contacts: state.contacts.filter((c) => !c.unsubscribed),
        organization: { name: "Acme Spa" },
      } }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(state.campaign, data);
        return state.campaign;
      },
      findMany: async () => [],
    },
    campaignDelivery: {
      findMany: async ({ where }: { where: { campaignId: string } }) =>
        state.deliveries.filter((d) => d.campaignId === where.campaignId),
      create: async ({ data }: { data: Delivery }) => {
        if (state.deliveries.some((d) => d.campaignId === data.campaignId && d.contactId === data.contactId)) {
          throw new Error("unique constraint");
        }
        state.deliveries.push(data);
        return data;
      },
      count: async ({ where }: { where: { campaignId: string } }) =>
        state.deliveries.filter((d) => d.campaignId === where.campaignId).length,
    },
  },
}));

import { deliverCampaign } from "@/lib/campaign-sender";

beforeEach(() => {
  vi.stubEnv("NEXTAUTH_SECRET", "test-secret");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.pipely.it");
  state.campaign.status = "DRAFT";
  state.campaign.totalSent = 0;
  state.deliveries = [];
  state.sentTo = [];
  state.sendFails = new Set();
  state.channel = "resend";
});

describe("invio campagna", () => {
  it("scrive agli iscritti attivi, salta i disiscritti e registra ogni destinatario", async () => {
    const r = await deliverCampaign("cmp_1", "org_1");
    expect(r).toEqual({ sent: 2, failed: 0 });
    expect(state.sentTo).toEqual(["uno@esempio.it", "due@esempio.it"]);
    expect(state.deliveries.map((d) => d.contactId)).toEqual(["c1", "c2"]);
    expect(state.campaign.status).toBe("SENT");
    expect(state.campaign.totalSent).toBe(2);
  });

  it("ripreso dopo un'interruzione, non riscrive a chi ha già ricevuto", async () => {
    // primo tentativo: passa solo il primo contatto, poi la function "cade"
    state.sendFails.add("due@esempio.it");
    await deliverCampaign("cmp_1", "org_1");
    expect(state.sentTo).toEqual(["uno@esempio.it"]);

    // ripresa: la campagna torna in Bozza e riparte
    state.campaign.status = "DRAFT";
    state.sendFails.clear();
    state.sentTo = [];
    const r = await deliverCampaign("cmp_1", "org_1");

    expect(state.sentTo).toEqual(["due@esempio.it"]); // il primo NON riceve un doppione
    expect(r.sent).toBe(1);
    expect(state.campaign.totalSent).toBe(2); // il totale somma i due tentativi
    expect(state.campaign.status).toBe("SENT");
  });

  it("torna in bozza se nessun messaggio è partito", async () => {
    state.sendFails = new Set(["uno@esempio.it", "due@esempio.it"]);
    const r = await deliverCampaign("cmp_1", "org_1");
    expect(r).toEqual({ sent: 0, failed: 2 });
    expect(state.campaign.status).toBe("DRAFT");
    expect(state.campaign.totalSent).toBe(0);
    expect(state.deliveries).toHaveLength(0);
  });

  it("senza provider rilascia il blocco e spiega perché", async () => {
    state.channel = null;
    const r = await deliverCampaign("cmp_1", "org_1");
    expect(r.error).toMatch(/provider email/i);
    expect(state.campaign.status).toBe("DRAFT"); // non resta appesa in SENDING
    expect(state.sentTo).toHaveLength(0);
  });

  it("rifiuta una campagna già inviata o già in corso", async () => {
    state.campaign.status = "SENT";
    await expect(deliverCampaign("cmp_1", "org_1")).resolves.toMatchObject({ error: "Campagna già inviata" });
    state.campaign.status = "SENDING";
    await expect(deliverCampaign("cmp_1", "org_1")).resolves.toMatchObject({ error: "Campagna già in invio" });
  });

  it("personalizza il corpo e allega tracciamento, disiscrizione e nome mittente", async () => {
    await deliverCampaign("cmp_1", "org_1");
    expect(state.lastFromName).toBe("Rossi Srl");
    expect(state.lastHtml).toContain("Ciao Luca,");
    expect(state.lastHtml).toMatch(/\/api\/track\/click\/cmp_1\/c2\?url=.*&sig=/);
    expect(state.lastHtml).toMatch(/\/api\/track\/open\/cmp_1\/c2\?sig=/);
    expect(state.lastHtml).toContain("/emails/unsubscribe?cid=c2&lid=lst_1&sig=");
    expect(state.lastHtml).toContain("Acme Spa");
  });
});
