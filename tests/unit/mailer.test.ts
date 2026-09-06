import { beforeEach, describe, expect, it, vi } from "vitest";

// L'SDK Resend NON lancia sugli errori dell'API: restituisce { data, error }.
// Questi test bloccano la regressione che faceva passare per inviato un
// messaggio rifiutato (dominio non verificato, chiave errata, limite superato).
const state = vi.hoisted(() => ({
  send: vi.fn(),
  smtpRow: null as { isVerified: boolean } | null,
  smtpResult: { ok: true } as { ok: boolean; error?: string },
  smtpCalls: [] as Array<{ orgId: string; opts: Record<string, unknown> }>,
  logs: [] as string[],
}));

vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: state.send } },
  FROM_DEFAULT: "Pipely CRM <noreply@pipely.it>",
  isEmailEnabled: () => true,
}));
vi.mock("@/lib/smtp-send", () => ({
  sendViaSMTP: async (orgId: string, opts: Record<string, unknown>) => {
    state.smtpCalls.push({ orgId, opts });
    return state.smtpResult;
  },
}));
vi.mock("@/lib/db", () => ({
  db: { smtpConfig: { findUnique: async () => state.smtpRow } },
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: (_s: string, msg: string) => state.logs.push(msg), warn: () => {}, info: () => {} },
}));

import { resolveOrgChannel, sendOrgMail, sendPlatformMail } from "@/lib/mailer";

const mail = { to: "cliente@esempio.it", subject: "Oggetto", html: "<p>ciao</p>" };

beforeEach(() => {
  state.send.mockReset();
  state.smtpRow = null;
  state.smtpResult = { ok: true };
  state.smtpCalls = [];
  state.logs = [];
});

describe("invio di piattaforma", () => {
  it("tratta come fallimento l'errore restituito dall'API, non solo le eccezioni", async () => {
    state.send.mockResolvedValue({ data: null, error: { name: "validation_error", message: "The pipely.app domain is not verified" } });
    const r = await sendPlatformMail("reset-password", mail);
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ error: expect.stringContaining("not verified") });
    // e il guasto finisce nei log invece di sparire in silenzio
    expect(state.logs.join(" ")).toContain("reset-password");
  });

  it("riporta l'invio riuscito", async () => {
    state.send.mockResolvedValue({ data: { id: "re_123" }, error: null });
    await expect(sendPlatformMail("registrazione", mail)).resolves.toEqual({ ok: true, via: "resend" });
    expect(state.logs).toHaveLength(0);
  });

  it("intercetta anche gli errori di rete", async () => {
    state.send.mockRejectedValue(new Error("fetch failed"));
    const r = await sendPlatformMail("invito-team", mail);
    expect(r).toMatchObject({ ok: false, error: "fetch failed" });
  });

  it("usa il nome mittente scelto ma tiene l'indirizzo verificato", async () => {
    state.send.mockResolvedValue({ data: { id: "re_1" }, error: null });
    await sendPlatformMail("campagna", { ...mail, fromName: 'Rossi "Srl"' });
    expect(state.send.mock.calls[0]![0].from).toBe("Rossi Srl <noreply@pipely.it>");
    state.send.mockClear();
    await sendPlatformMail("campagna", mail);
    expect(state.send.mock.calls[0]![0].from).toBe("Pipely CRM <noreply@pipely.it>");
  });
});

describe("invio per conto di un'organizzazione", () => {
  it("preferisce l'SMTP verificato del cliente al mittente di piattaforma", async () => {
    state.smtpRow = { isVerified: true };
    await expect(resolveOrgChannel("org_1")).resolves.toBe("smtp");
    await expect(sendOrgMail("org_1", mail)).resolves.toEqual({ ok: true, via: "smtp" });
    expect(state.smtpCalls).toHaveLength(1);
    expect(state.send).not.toHaveBeenCalled();
  });

  it("ignora un SMTP configurato ma non verificato", async () => {
    state.smtpRow = { isVerified: false };
    state.send.mockResolvedValue({ data: { id: "re_1" }, error: null });
    await expect(sendOrgMail("org_1", mail)).resolves.toEqual({ ok: true, via: "resend" });
    expect(state.smtpCalls).toHaveLength(0);
  });

  it("non ripiega su Resend se l'SMTP del cliente fallisce", async () => {
    state.smtpRow = { isVerified: true };
    state.smtpResult = { ok: false, error: "535 authentication failed" };
    const r = await sendOrgMail("org_1", mail);
    expect(r).toMatchObject({ ok: false, error: "535 authentication failed" });
    // il messaggio partirebbe da un mittente che il cliente non si aspetta
    expect(state.send).not.toHaveBeenCalled();
  });

  it("riusa il canale già risolto senza interrogare di nuovo il database", async () => {
    state.smtpRow = { isVerified: true };
    state.send.mockResolvedValue({ data: { id: "re_1" }, error: null });
    // canale imposto a "resend": la riga SMTP verificata non viene riletta
    await expect(sendOrgMail("org_1", mail, "resend")).resolves.toEqual({ ok: true, via: "resend" });
    expect(state.smtpCalls).toHaveLength(0);
  });

  it("passa il cc e il replyTo al canale scelto", async () => {
    state.smtpRow = { isVerified: true };
    await sendOrgMail("org_1", { ...mail, cc: ["capo@esempio.it"], replyTo: "io@azienda.it" });
    expect(state.smtpCalls[0]!.opts).toMatchObject({ cc: ["capo@esempio.it"], replyTo: "io@azienda.it" });
  });
});
