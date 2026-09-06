import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  asText, clampScore, completenessScore, dedupeKey, emailPlausibleForCompany, findRowByName, isLinkedInUrl,
  matchAiRows, normalizeCompanyName, normalizeWebsite, parseJsonArrayLenient, sanitizeEmail, sanitizePhone, websiteDomain,
  companyNameToken, websiteVariants,
  atecoMatchesSector, employeeRange, formatPhoneForDisplay, normalizeItalianPhone, sizeMatches,
} from "@/lib/lead-finder-utils";

describe("filtri deterministici sui dati del registro", () => {
  it("interpreta le fasce di dipendenti del registro e del modulo", () => {
    expect(employeeRange("oltre 1000")).toEqual({ min: 1001, max: Infinity });
    expect(employeeRange("da 50 a 99")).toEqual({ min: 50, max: 99 });
    expect(employeeRange("fino a 5")).toEqual({ min: 0, max: 5 });
    expect(employeeRange("11-50")).toEqual({ min: 11, max: 50 });
    expect(employeeRange("1000+")).toEqual({ min: 1000, max: Infinity });
    expect(employeeRange("N/D")).toBeNull();
    expect(employeeRange(null)).toBeNull();
  });
  it("confronta la dimensione richiesta con quella del registro senza scartare i dati mancanti", () => {
    expect(sizeMatches("11-50", "da 20 a 49")).toBe(true);
    expect(sizeMatches("11-50", "da 50 a 99")).toBe(true);
    expect(sizeMatches("1-10", "oltre 1000")).toBe(false);
    expect(sizeMatches("1000+", "da 500 a 999")).toBe(false);
    expect(sizeMatches("1-10", null)).toBeNull();
    expect(sizeMatches("", "da 6 a 9")).toBeNull();
  });
  it("abbina i codici ATECO ai settori del modulo", () => {
    expect(atecoMatchesSector("24.20.1", "Manifattura / Industria")).toBe(true);
    expect(atecoMatchesSector("62.01", "Tecnologia / Software")).toBe(true);
    expect(atecoMatchesSector("62.01", "Manifattura / Industria")).toBe(false);
    expect(atecoMatchesSector("47.11", "Retail / E-commerce")).toBe(true);
    expect(atecoMatchesSector("45.20", "Retail / E-commerce")).toBe(false);
    expect(atecoMatchesSector("58.21", "Tecnologia / Software")).toBe(true);
    expect(atecoMatchesSector("58.11", "Tecnologia / Software")).toBe(false);
    expect(atecoMatchesSector(null, "Manifattura / Industria")).toBeNull();
    expect(atecoMatchesSector("24.20.1", "Altro")).toBeNull();
    expect(atecoMatchesSector("N/D", "Manifattura / Industria")).toBeNull();
  });
  it("porta i telefoni italiani in E.164 e li mostra leggibili", () => {
    expect(normalizeItalianPhone("+39 035 560111")).toBe("+39035560111");
    expect(normalizeItalianPhone("39 035 560 111")).toBe("+39035560111");
    expect(normalizeItalianPhone("035 560111")).toBe("+39035560111");
    expect(normalizeItalianPhone("335 1234567")).toBe("+393351234567");
    expect(normalizeItalianPhone("0039 02 1234567")).toBe("+39021234567");
    expect(normalizeItalianPhone("+41 44 123 45 67")).toBe("+41441234567");
    expect(normalizeItalianPhone("12345")).toBeNull();
    expect(formatPhoneForDisplay("+39035560111")).toBe("+39 035560111");
    expect(formatPhoneForDisplay("+41441234567")).toBe("+41441234567");
  });
});

describe("normalizzazione aziende", () => {
  it("riconosce la stessa azienda con suffissi, maiuscole, accenti e punteggiatura diversi", () => {
    const key = dedupeKey("Rossi S.r.l.");
    expect(dedupeKey("ROSSI SRL")).toBe(key);
    expect(dedupeKey("rossi srl.")).toBe(key);
    expect(dedupeKey("Rossi - S.R.L.")).toBe(key);
    expect(dedupeKey("Caffè Bianchi S.p.A.")).toBe(dedupeKey("Caffe Bianchi spa"));
    expect(dedupeKey("Rossi Srl")).not.toBe(dedupeKey("Rossi Impianti Srl"));
    expect(dedupeKey("Studio Verdi Associati")).not.toBe(dedupeKey("Studio Verdi"));
  });
  it("mostra i nomi in Title Case con le particelle minuscole", () => {
    expect(normalizeCompanyName("OFFICINA DEL SOLE SRL")).toBe("Officina del Sole Srl");
    expect(normalizeCompanyName("VIA E. FERMI 51")).toBe("Via E. Fermi 51");
    expect(normalizeCompanyName("SAME DEUTZ-FAHR ITALIA SPA")).toBe("Same Deutz-Fahr Italia Spa");
    expect(normalizeCompanyName("DA VINCI SRL")).toBe("Da Vinci Srl");
    expect(normalizeCompanyName("SANPELLEGRINO SPA (OVVERO IN FORMA ABBREVIATA SA.PE. SPA)")).toBe("Sanpellegrino Spa");
  });
});

describe("email, telefoni, siti", () => {
  it("scarta email finte o malformate e normalizza le altre", () => {
    expect(sanitizeEmail("Info@Rossi.IT ")).toBe("info@rossi.it");
    expect(sanitizeEmail("info@example.com")).toBeNull();
    expect(sanitizeEmail("info@nomeazienda.it")).toBeNull();
    expect(sanitizeEmail("non-una-email")).toBeNull();
    expect(sanitizeEmail("privacy@brembo.com")).toBeNull();
    expect(sanitizeEmail("press@brembo.com")).toBeNull();
    expect(sanitizeEmail("stampa@tipografia.it")).toBe("stampa@tipografia.it");
    expect(sanitizeEmail("no-reply@rossi.it")).toBeNull();
    expect(sanitizeEmail("dpo.ufficio@rossi.it")).toBeNull();
    expect(sanitizeEmail("commerciale@rossi.it")).toBe("commerciale@rossi.it");
    expect(sanitizeEmail(null)).toBeNull();
  });
  it("accetta solo telefoni verosimili", () => {
    expect(sanitizePhone("+39 02 1234567")).toBe("+39 02 1234567");
    expect(sanitizePhone("000000000")).toBeNull();
    expect(sanitizePhone("12345")).toBeNull();
  });
  it("estrae il dominio del sito", () => {
    expect(websiteDomain("https://www.rossi.it/contatti")).toBe("rossi.it");
    expect(websiteDomain("shop.rossi.it")).toBe("shop.rossi.it");
    expect(websiteDomain("nonsenso")).toBeNull();
    expect(websiteDomain(null)).toBeNull();
  });
  it("giudica plausibile una email solo se coerente con il sito, generica o PEC", () => {
    expect(emailPlausibleForCompany("info@rossi.it", "https://www.rossi.it")).toBe(true);
    expect(emailPlausibleForCompany("info@mail.rossi.it", "rossi.it")).toBe(true);
    expect(emailPlausibleForCompany("info@rossi.it", "https://shop.rossi.it")).toBe(true);
    expect(emailPlausibleForCompany("info@altraditta.it", "https://www.rossi.it")).toBe(false);
    expect(emailPlausibleForCompany("mario.rossi@gmail.com", "https://www.rossi.it")).toBe(true);
    expect(emailPlausibleForCompany("rossi@pec.rossi.it", "https://www.altro.it")).toBe(true);
    expect(emailPlausibleForCompany("rossi@legalmail.it", "https://www.altro.it")).toBe(true);
    expect(emailPlausibleForCompany("info@altraditta.it", null)).toBe(true);
  });
  it("accetta come sito solo domini aziendali, in forma canonica", () => {
    expect(normalizeWebsite("www.rossi.it/contatti")).toBe("https://rossi.it");
    expect(normalizeWebsite("HTTP://Shop.Rossi.IT")).toBe("https://shop.rossi.it");
    expect(normalizeWebsite("https://www.facebook.com/rossi")).toBeNull();
    expect(normalizeWebsite("https://it.linkedin.com/company/rossi")).toBeNull();
    expect(normalizeWebsite("https://www.paginegialle.it/rossi")).toBeNull();
    expect(normalizeWebsite("nonsenso")).toBeNull();
    expect(normalizeWebsite(null)).toBeNull();
  });
  it("riconosce solo veri profili LinkedIn", () => {
    expect(isLinkedInUrl("https://www.linkedin.com/in/mario-rossi/")).toBe("https://www.linkedin.com/in/mario-rossi/");
    expect(isLinkedInUrl("https://it.linkedin.com/company/rossi-srl")).toBe("https://it.linkedin.com/company/rossi-srl");
    expect(isLinkedInUrl("linkedin.com/in/mario")).toBeNull();
    expect(isLinkedInUrl("https://www.facebook.com/rossi")).toBeNull();
    expect(isLinkedInUrl(null)).toBeNull();
  });
  it("punteggio di completezza tra 65 e 100", () => {
    expect(completenessScore(false, false, false, false)).toBe(65);
    expect(completenessScore(true, true, true, true)).toBe(100);
    expect(clampScore("85", 50)).toBe(85);
    expect(clampScore("boh", 50)).toBe(50);
    expect(clampScore(140, 50)).toBe(100);
    expect(asText(" null ")).toBeNull();
    expect(asText(" Mario ")).toBe("Mario");
  });
});

describe("risposte del modello", () => {
  it("legge un array JSON anche dentro un blocco di codice", () => {
    const rows = parseJsonArrayLenient('Ecco:\n```json\n[{"id":0,"email":"a@b.it"},{"id":1,"email":null}]\n```');
    expect(rows).toHaveLength(2);
    expect(rows[1]!.email).toBeNull();
  });
  it("recupera gli oggetti completi quando la risposta è troncata", () => {
    const truncated = '[{"id":0,"companyName":"Rossi","score":80},{"id":1,"companyName":"Bianchi \\"B\\"","score":70},{"id":2,"companyName":"Ver';
    const rows = parseJsonArrayLenient(truncated);
    expect(rows.map((r) => r.id)).toEqual([0, 1]);
    expect(rows[1]!.companyName).toBe('Bianchi "B"');
  });
  it("recupera gli altri oggetti quando uno contiene virgolette non escapate", () => {
    const broken = '[{"id":0,"motivation":"Leader "assoluto","score":80},{"id":1,"motivation":"ok","score":70},{"id":2,"motivation":"buona","score":60}]';
    const rows = parseJsonArrayLenient(broken);
    expect(rows.map((r) => r.id)).toEqual([1, 2]);
  });
  it("rifiuta risposte senza array o senza oggetti validi", () => {
    expect(() => parseJsonArrayLenient("Non posso aiutarti")).toThrow(/nessun array/);
    expect(() => parseJsonArrayLenient("[ciao")).toThrow(/malformato/);
  });
  it("abbina le righe per id e ignora id fuori intervallo o duplicati", () => {
    const map = matchAiRows([{ id: "1", a: 1 }, { id: 5, a: 2 }, { id: 0, a: 3 }, { id: 0, a: 4 }, { a: 5 }], 3);
    expect([...map.keys()].sort()).toEqual([0, 1]);
    expect(map.get(0)!.a).toBe(3);
    expect(findRowByName([{ companyName: "Rossi S.r.l." }], "ROSSI SRL")).toBeDefined();
    expect(findRowByName([{ companyName: "Rossi S.r.l." }], "Bianchi")).toBeUndefined();
  });
});

describe("verifica dei siti proposti", () => {
  it("sceglie la parola distintiva del nome per riconoscere il sito", () => {
    expect(companyNameToken("Brembo Spa")).toBe("brembo");
    expect(companyNameToken("Same Deutz-Fahr Italia Spa")).toBe("deutz");
    expect(companyNameToken("Exide Technologies S.R.L.")).toBe("exide");
    expect(companyNameToken("Radici Partecipazioni Spa")).toBe("radici");
    expect(companyNameToken("Officine Meccaniche Srl")).toBeNull();
  });
  it("prova il sito con e senza www, in https e in http", () => {
    expect(websiteVariants("https://brembogroup.com")).toEqual(["https://brembogroup.com", "https://www.brembogroup.com", "http://brembogroup.com", "http://www.brembogroup.com"]);
    expect(websiteVariants("https://www.stemin.it/")).toEqual(["https://www.stemin.it", "https://stemin.it", "http://www.stemin.it", "http://stemin.it"]);
    expect(websiteVariants("https://shop.rossi.it/catalogo")).toEqual(["https://shop.rossi.it/catalogo"]);
  });
});

describe("client OpenRouter", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    fetchMock.mockReset();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

  it("riprova una volta dopo un limite di velocità e restituisce il testo", async () => {
    const { chatCompletion } = await import("@/lib/openrouter");
    fetchMock.mockReturnValueOnce(reply(429, { error: { message: "rate limited" } }));
    fetchMock.mockReturnValueOnce(reply(200, { choices: [{ message: { content: "  ciao  " } }] }));
    await expect(chatCompletion([{ role: "user", content: "x" }], { retries: 1 })).resolves.toBe("ciao");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const sent = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(sent.model).toBeTruthy();
    expect(sent.max_tokens).toBe(600);
    expect(sent.reasoning).toEqual({ effort: "low" });
  });
  it("inoltra lo sforzo di ragionamento richiesto e segnala le risposte troncate", async () => {
    const { chatCompletion } = await import("@/lib/openrouter");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    fetchMock.mockReturnValueOnce(reply(200, {
      choices: [{ message: { content: "[{" }, finish_reason: "length" }],
      usage: { completion_tokens_details: { reasoning_tokens: 2118 } },
    }));
    await expect(chatCompletion([{ role: "user", content: "x" }], { reasoningEffort: "minimal", maxTokens: 2500 })).resolves.toBe("[{");
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string).reasoning).toEqual({ effort: "minimal" });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/troncata a 2500 token \(2118 di ragionamento\)/));
    warn.mockRestore();
  });
  it("non riprova su errori del client e propaga il messaggio", async () => {
    const { chatCompletion, OpenRouterError } = await import("@/lib/openrouter");
    fetchMock.mockReturnValueOnce(reply(400, { error: { message: "modello inesistente" } }));
    await expect(chatCompletion([{ role: "user", content: "x" }])).rejects.toMatchObject({ message: "modello inesistente", status: 400 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockReturnValueOnce(reply(500, { error: { message: "boom" } }));
    fetchMock.mockReturnValueOnce(reply(500, { error: { message: "boom" } }));
    await expect(chatCompletion([{ role: "user", content: "x" }], { retries: 1 })).rejects.toBeInstanceOf(OpenRouterError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("rifiuta subito senza chiave", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const { chatCompletion } = await import("@/lib/openrouter");
    await expect(chatCompletion([{ role: "user", content: "x" }])).rejects.toThrow(/OPENROUTER_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
