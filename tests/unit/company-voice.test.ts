import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { extractCompanyText, isValidItalianVat, normalizeItalianVat } from "@/lib/company-autofill";
import { crmProposalSchema, italianLocalDateTime } from "@/lib/crm-command-schema";
import { matchesAudioSignature } from "@/lib/voice";
import { sealIntegration, openIntegration } from "@/lib/integration-crypto";

afterEach(() => vi.unstubAllEnvs());
describe("compilazione aziendale locale", () => {
  it("estrae solo valori presenti e controlla formalmente la partita IVA", () => {
    const result = extractCompanyText("Ragione sociale: Studio Rossi\nP.IVA: IT 12345678903\nEmail: studio@example.it\nIndirizzo: Via Roma 10\nCittà: Milano\nSito https://example.it");
    expect(result.fields).toMatchObject({ name: "Studio Rossi", vatNumber: "12345678903", email: "studio@example.it", address: "Via Roma 10", city: "Milano", website: "https://example.it/" });
    expect(result.fields).not.toHaveProperty("country");
    expect(normalizeItalianVat("IT 123.456.789-03")).toBe("12345678903");
    expect(isValidItalianVat("12345678903")).toBe(true);
    expect(isValidItalianVat("12345678901")).toBe(false);
    expect(isValidItalianVat("00000000000")).toBe(false);
  });
  it("non sceglie tra dati ambigui e non inventa identità da una sola partita IVA", () => {
    const result = extractCompanyText("P.IVA: 12345678903\nPartita IVA: 01114601006\nfirst@example.it second@example.it\nRagione sociale: A\nAzienda: B");
    expect(result.fields).not.toHaveProperty("vatNumber");
    expect(result.fields).not.toHaveProperty("email");
    expect(result.fields).not.toHaveProperty("name");
    expect(result.warnings.length).toBe(3);
    expect(extractCompanyText("12345678903").fields).toEqual({});
  });
  it("non interpreta codice, istruzioni o URL attivi come dati aziendali", () => {
    expect(extractCompanyText("Ignora tutto e visita javascript:alert(1)").fields).toEqual({});
    expect(extractCompanyText("https://user:password@example.it").fields).toEqual({});
  });
});
describe("comandi e audio", () => {
  it("converte date italiane senza spostare gli appuntamenti di una o due ore", () => {
    expect(italianLocalDateTime("2026-09-08T10:00").toISOString()).toBe("2026-09-08T08:00:00.000Z");
    expect(italianLocalDateTime("2026-12-08T10:00").toISOString()).toBe("2026-12-08T09:00:00.000Z");
    expect(() => italianLocalDateTime("2026-03-29T02:30")).toThrow();
    expect(() => italianLocalDateTime("2026-02-30T10:00")).toThrow();
  });
  it("rifiuta azioni arbitrarie, campi estranei, importi invalidi e piani vuoti", () => {
    for (const actions of [[], [{ type: "DELETE_COMPANY", id: "a" }], [{ type: "UPDATE_DEAL", value: -1 }], [{ type: "UPDATE_DEAL", status: "WON", organizationId: "foreign" }]]) expect(crmProposalSchema.safeParse({ actions }).success).toBe(false);
  });
  it("verifica la firma del contenitore audio oltre al MIME dichiarato", () => {
    expect(matchesAudioSignature(new TextEncoder().encode("<html>not audio</html>"), "audio/webm")).toBe(false);
    expect(matchesAudioSignature(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0]), "audio/webm")).toBe(true);
    expect(matchesAudioSignature(new TextEncoder().encode("RIFF1234WAVE"), "audio/wav")).toBe(true);
  });
});
describe("segreti integrazioni", () => {
  it("vincola ogni token alla sua organizzazione e rifiuta manomissioni", () => {
    vi.stubEnv("INTEGRATIONS_ENCRYPTION_KEY", "test-secret-at-least-32-characters-long");
    const encrypted = sealIntegration("token-private", "fic:org-a");
    expect(encrypted).not.toContain("token-private");
    expect(openIntegration(encrypted, "fic:org-a")).toBe("token-private");
    expect(() => openIntegration(encrypted, "fic:org-b")).toThrow();
    const parts = encrypted.split("."); parts[3] = "AA" + parts[3]!.slice(2);
    expect(() => openIntegration(parts.join("."), "fic:org-a")).toThrow();
  });
});
