import { describe, expect, it } from "vitest";
import { contactImportSchema, deduplicateContactImport, parseContactCSV } from "@/lib/contact-import";

describe("importazione contatti", () => {
  it("legge CSV italiani con BOM e separatore punto e virgola", () => {
    expect(parseContactCSV('\uFEFFNome;Cognome;Email;Azienda\r\nMario;Rossi;mario@example.it;Studio Rossi'))
      .toEqual([{ firstName: "Mario", lastName: "Rossi", email: "mario@example.it", companyName: "Studio Rossi" }]);
  });
  it("mantiene virgole, righe multiple e virgolette nei campi", () => {
    expect(parseContactCSV('Nome,Azienda,Ruolo\nMario,"Studio, Associati","Consulente ""senior""\nCommerciale"'))
      .toEqual([{ firstName: "Mario", companyName: "Studio, Associati", jobTitle: 'Consulente "senior"\nCommerciale' }]);
  });
  it("legge sep= di Excel, celle vuote e telefoni con zeri iniziali", () => {
    expect(parseContactCSV('sep=;\r\nNome;Telefono;Azienda\r\nMario;0212345;\r\n')[0])
      .toEqual({ firstName: "Mario", phone: "0212345", companyName: "" });
  });
  it("legge i TSV e ignora righe completamente vuote", () => {
    expect(parseContactCSV('Nome\tE-mail\nMario\tmario@example.it\n\t\n')).toHaveLength(1);
  });
  it.each([
    ['Nome,Email\n"Mario,mario@example.it', /non chiuse/],
    ['Nome,Email\nMario,mario@example.it,extra', /colonne/],
    ['Nome,firstName\nMario,Mario', /stesso campo/],
    ['Email\nmario@example.it', /colonna Nome/],
    ['Nome\n"Mario"oops', /Virgolette/],
  ])("segnala file non validi senza saltare righe: %s", (csv, message) => {
    expect(() => parseContactCSV(csv)).toThrow(message);
  });
  it("normalizza spazi ed email e rifiuta righe prive di nome", () => {
    expect(contactImportSchema.parse([{ firstName: " Mario ", email: " MARIO@EXAMPLE.IT " }])[0])
      .toEqual({ firstName: "Mario", email: "mario@example.it" });
    expect(contactImportSchema.safeParse([{ firstName: "   " }]).success).toBe(false);
    expect(contactImportSchema.safeParse([{ firstName: "Mario", email: "errata" }]).success).toBe(false);
  });
  it("rifiuta importazioni oltre il limite e payload non array", () => {
    expect(contactImportSchema.safeParse(Array.from({ length: 2001 }, () => ({ firstName: "Mario" }))).success).toBe(false);
    expect(contactImportSchema.safeParse("csv").success).toBe(false);
  });
  it("rimuove duplicati esistenti e interni senza confondere contatti senza email", () => {
    const rows = contactImportSchema.parse([
      { firstName: "Mario", email: "mario@example.it" },
      { firstName: "Giulia", email: "GIULIA@example.it" },
      { firstName: "Giulia bis", email: "giulia@example.it" },
      { firstName: "Luca" }, { firstName: "Luca bis" },
    ]);
    const result = deduplicateContactImport(rows, [" MARIO@EXAMPLE.IT ", null]);
    expect(result.duplicates).toBe(2);
    expect(result.contacts.map(row => row.firstName)).toEqual(["Giulia", "Luca", "Luca bis"]);
  });
});
