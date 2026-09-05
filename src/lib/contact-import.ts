import { z } from "zod";
import type { ImportRow } from "@/types/contacts";

export const MAX_CONTACT_IMPORT_ROWS = 2000;

const optionalText = (max: number) => z.string().trim().max(max).optional();
export const contactInputSchema = z.object({
  firstName: z.string().trim().min(1, "Nome obbligatorio").max(150),
  lastName: optionalText(150),
  email: z.string().trim().toLowerCase().max(254).email("Email non valida").or(z.literal("")).optional(),
  phone: optionalText(80),
  jobTitle: optionalText(200),
  companyId: optionalText(128),
});
export const contactImportRowSchema = contactInputSchema.omit({ companyId: true }).extend({
  companyName: optionalText(250),
});
export const contactImportSchema = z.array(contactImportRowSchema)
  .min(1, "Il file non contiene contatti")
  .max(MAX_CONTACT_IMPORT_ROWS, `Importa al massimo ${MAX_CONTACT_IMPORT_ROWS} contatti per volta`);
export type ContactImportRow = z.infer<typeof contactImportRowSchema>;

const aliases: Record<string, string[]> = {
  firstName: ["firstname", "nome", "name"],
  lastName: ["lastname", "cognome", "surname"],
  email: ["email", "mail"],
  phone: ["phone", "telefono", "tel", "cellulare", "mobile"],
  jobTitle: ["jobtitle", "ruolo", "title", "posizione"],
  companyName: ["company", "azienda", "companyname", "ragionesociale"],
};

export function resolveContactHeader(raw: string): string {
  const normalized = raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return Object.entries(aliases).find(([, values]) => values.includes(normalized))?.[0] ?? raw.trim();
}

export function validateContactHeaders(headers: string[]) {
  if (!headers.includes("firstName")) throw new Error("Manca la colonna Nome (o firstName)");
  const recognized = headers.filter((header) => header in aliases);
  if (new Set(recognized).size !== recognized.length) {
    throw new Error("Più colonne corrispondono allo stesso campo: controlla le intestazioni");
  }
}

/** Handles Excel's Italian delimiter, quoted separators, escaped quotes and multiline cells. */
export function parseContactCSV(input: string): ImportRow[] {
  let text = input.replace(/^\uFEFF/, "");
  const separatorLine = /^sep=([,;\t])\r?\n/i.exec(text);
  let delimiter = separatorLine?.[1];
  if (separatorLine) text = text.slice(separatorLine[0].length);
  if (!text.trim()) return [];

  if (!delimiter) {
    const counts = new Map([[",", 0], [";", 0], ["\t", 0]]);
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i]!;
      if (char === '"') {
        if (quoted && text[i + 1] === '"') i++;
        else quoted = !quoted;
      } else if (!quoted) {
        if (char === "\r" || char === "\n") break;
        if (counts.has(char)) counts.set(char, counts.get(char)! + 1);
      }
    }
    delimiter = [...counts].sort((a, b) => b[1] - a[1])[0]![0];
  }

  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let quoteClosed = false;
  const endCell = () => { row.push(cell.trim()); cell = ""; quoteClosed = false; };
  const endRow = () => {
    endCell();
    if (row.some(Boolean)) records.push(row);
    row = [];
    if (records.length > MAX_CONTACT_IMPORT_ROWS + 1) {
      throw new Error(`Importa al massimo ${MAX_CONTACT_IMPORT_ROWS} contatti per volta`);
    }
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; quoteClosed = true; }
      } else cell += char;
    } else if (char === delimiter) endCell();
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else if (char === '"' && !cell.trim() && !quoteClosed) {
      cell = "";
      quoted = true;
    } else if (char === '"' || (quoteClosed && char.trim())) {
      throw new Error(`Virgolette non valide nel record ${records.length + 1}`);
    } else cell += char;
  }
  if (quoted) throw new Error("Il CSV contiene un campo con virgolette non chiuse");
  if (cell || row.length || quoteClosed) endRow();

  const headers = records.shift()?.map(resolveContactHeader) ?? [];
  validateContactHeaders(headers);
  return records.map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`Record ${index + 2}: numero di colonne diverso dall'intestazione`);
    }
    return Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]));
  });
}

export function deduplicateContactImport(rows: ContactImportRow[], existingEmails: (string | null)[]) {
  const emails = new Set(existingEmails.map((email) => email?.trim().toLowerCase()).filter(Boolean));
  const contacts: ContactImportRow[] = [];
  let duplicates = 0;
  for (const row of rows) {
    const email = row.email?.trim().toLowerCase();
    if (email && emails.has(email)) duplicates++;
    else {
      contacts.push(row);
      if (email) emails.add(email);
    }
  }
  return { contacts, duplicates };
}
