import { describe, it, expect } from "vitest";
import { mockAIReply, getAIInsights, generateEmailDraft } from "@/lib/mock-ai";

describe("mockAIReply", () => {
  it("risponde alla panoramica pipeline", () => {
    const reply = mockAIReply("dammi la panoramica pipeline");
    expect(reply).toContain("pipeline");
    expect(reply.length).toBeGreaterThan(20);
  });

  it("risponde agli affari a rischio", () => {
    const reply = mockAIReply("quali affari sono a rischio?");
    expect(reply.length).toBeGreaterThan(10);
  });

  it("risponde al win rate", () => {
    const reply = mockAIReply("qual è il win rate?");
    expect(reply).toMatch(/win rate|tasso/i);
  });

  it("risponde ai lead", () => {
    const reply = mockAIReply("quali lead sono caldi?");
    expect(reply).toMatch(/lead/i);
  });

  it("risponde al forecast", () => {
    const reply = mockAIReply("forecast revenue del mese");
    expect(reply).toMatch(/forecast|revenue/i);
  });

  it("risponde alle raccomandazioni", () => {
    const reply = mockAIReply("cosa mi consigli di fare?");
    expect(reply).toMatch(/consigli|raccomand/i);
  });

  it("risponde all'help", () => {
    const reply = mockAIReply("aiuto, cosa sai fare?");
    expect(reply).toMatch(/assistente|pipely/i);
  });

  it("ha un fallback per query sconosciute", () => {
    const reply = mockAIReply("blabla xyz 123 incomprensibile");
    expect(reply.length).toBeGreaterThan(10);
  });
});

describe("getAIInsights", () => {
  it("restituisce un array", () => {
    const insights = getAIInsights();
    expect(Array.isArray(insights)).toBe(true);
  });

  it("ogni insight ha id, severity, title, body", () => {
    const insights = getAIInsights();
    for (const insight of insights) {
      expect(insight).toHaveProperty("id");
      expect(insight).toHaveProperty("severity");
      expect(insight).toHaveProperty("title");
      expect(insight).toHaveProperty("body");
      expect(["info", "warning", "danger", "success"]).toContain(insight.severity);
    }
  });

  it("restituisce almeno 1 insight", () => {
    const insights = getAIInsights();
    expect(insights.length).toBeGreaterThanOrEqual(1);
  });
});

describe("generateEmailDraft", () => {
  it("genera un draft per follow-up", () => {
    const draft = generateEmailDraft("follow-up dopo demo", { contactName: "Mario", dealTitle: "Affare Test" });
    expect(draft).toHaveProperty("subject");
    expect(draft).toHaveProperty("body");
    expect(draft.subject.length).toBeGreaterThan(3);
    expect(draft.body).toContain("Mario");
  });

  it("genera un draft per proposta", () => {
    const draft = generateEmailDraft("invia proposta commerciale");
    expect(draft.subject).toMatch(/proposta/i);
  });

  it("genera un draft per ringraziamento", () => {
    const draft = generateEmailDraft("ringraziamento per il meeting");
    expect(draft.body).toMatch(/grazie|ringrazi/i);
  });

  it("genera un draft generico per prompt sconosciuto", () => {
    const draft = generateEmailDraft("xyz random prompt");
    expect(draft.subject.length).toBeGreaterThan(0);
    expect(draft.body.length).toBeGreaterThan(20);
  });
});
