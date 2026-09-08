import { describe, expect, it } from "vitest";
import { GUIDE_SECTIONS, getGuideFeatureMap } from "@/lib/guide-data";

// La guida è l'unica fonte da cui l'assistente AI ricava cosa sa fare Pipely.
// Questi test difendono quel collegamento e la coerenza fra guida e prodotto.

const allArticles = GUIDE_SECTIONS.flatMap((s) => s.articles);
const allText = JSON.stringify(GUIDE_SECTIONS).toLowerCase();

describe("indice delle funzioni per l'assistente", () => {
  it("elenca ogni sezione e ogni articolo della guida", () => {
    const map = getGuideFeatureMap();
    for (const section of GUIDE_SECTIONS) expect(map).toContain(section.label);
    for (const article of allArticles) expect(map).toContain(article.title);
  });

  it("resta abbastanza compatto da viaggiare in ogni richiesta", () => {
    // Viene aggiunto a ogni domanda all'assistente: senza un tetto, crescendo la guida
    // mangerebbe il contesto lasciato ai dati reali del CRM.
    expect(getGuideFeatureMap().length).toBeLessThan(12_000);
  });
});

describe("coerenza fra guida e prodotto", () => {
  it("non promette l'accesso con Google, rimosso dal prodotto", () => {
    // La regressione che ha motivato questi test: il provider era stato tolto dal codice
    // e la guida ha continuato a spiegarlo per mesi, in nove punti diversi.
    expect(allText).not.toMatch(/google oauth/);
    expect(allText).not.toMatch(/registrati anche con google|accedi a pipely con google|login google/);
  });

  it("rimanda al dominio in uso e non a quello vecchio", () => {
    expect(allText).not.toContain("pipely.app");
  });

  it("documenta le funzioni recenti, altrimenti l'assistente risponde che non esistono", () => {
    for (const atteso of ["note vocali", "comandi crm", "fatture in cloud", "lead finder"]) {
      expect(allText).toContain(atteso);
    }
  });
});

describe("integrità dei dati della guida", () => {
  it("usa identificatori unici per sezioni e articoli", () => {
    const sectionIds = GUIDE_SECTIONS.map((s) => s.id);
    expect(new Set(sectionIds).size).toBe(sectionIds.length);
    const articleIds = allArticles.map((a) => a.id);
    expect(new Set(articleIds).size).toBe(articleIds.length);
  });

  it("ogni articolo ha titolo, estratto e contenuto", () => {
    for (const article of allArticles) {
      expect(article.title.trim().length, `titolo di ${article.id}`).toBeGreaterThan(0);
      expect(article.excerpt.trim().length, `estratto di ${article.id}`).toBeGreaterThan(0);
      expect(article.blocks?.length ?? 0, `blocchi di ${article.id}`).toBeGreaterThan(0);
    }
  });
});
