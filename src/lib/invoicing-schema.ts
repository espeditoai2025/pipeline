import { z } from "zod";
import { isValidItalianVat, normalizeItalianVat } from "@/lib/company-autofill";
export const invoiceExportInputSchema = z.object({
  invoiceId: z.string().min(1).max(100),
  recipientName: z.string().trim().min(1).max(200),
  vatNumber: z.string().trim().max(32).transform(normalizeItalianVat).refine(value => !value || isValidItalianVat(value), "Partita IVA italiana non valida"),
  taxCode: z.string().trim().toUpperCase().max(16).refine(value => !value || /^(?:[A-Z0-9]{16}|\d{11})$/.test(value), "Codice fiscale non valido"),
  address: z.string().trim().min(1, "Indirizzo obbligatorio").max(200),
  city: z.string().trim().min(1, "Città obbligatoria").max(100),
  postalCode: z.string().regex(/^\d{5}$/, "CAP di 5 cifre richiesto"),
  province: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Provincia di 2 lettere richiesta"),
  sdiCode: z.string().trim().toUpperCase().refine(value => !value || /^[A-Z0-9]{7}$/.test(value), "Codice destinatario di 7 caratteri richiesto"),
  pec: z.union([z.email(), z.literal("")]),
  paymentCode: z.enum(["MP01", "MP02", "MP05", "MP08", "MP19", "MP20"]),
  numeration: z.string().trim().max(20),
  vatIds: z.array(z.number().int().nonnegative()).min(1).max(200),
}).refine(value => value.vatNumber || value.taxCode, "Inserisci partita IVA o codice fiscale").refine(value => value.sdiCode || value.pec, "Inserisci il codice destinatario o la PEC. Per un privato senza codice usa 0000000.");
export type InvoiceExportInput = z.input<typeof invoiceExportInputSchema>;
export type InvoiceExportPreview = { previewId: string; recipient: string; company: string; total: number; currency: string; invoiceId: string };
export type InvoiceExportStatus = { documentId: number | null; status: string; remoteNumber: string | null; eInvoiceStatus: string | null; remoteTotal: number | null; error: string | null; updatedAt: string };
export const eInvoiceLabels: Record<string, string> = {
  not_sent: "Da inviare", missing: "Documento mancante", attempt: "Tentativo di invio in corso", sent: "Invio effettuato", pending: "Controlli e invio in corso", processing: "Consegna SdI in corso", error: "Errore di invio", discarded: "Scartata dallo SdI", not_delivered: "Mancata consegna", accepted: "Accettata", rejected: "Rifiutata", no_response: "Nessuna risposta nei termini", manual_accepted: "Accettata manualmente", manual_rejected: "Rifiutata manualmente",
};
