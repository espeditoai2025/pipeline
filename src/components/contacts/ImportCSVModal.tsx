"use client";

import { useRef, useState } from "react";
import { Upload, AlertCircle, CheckCircle2, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { importContacts } from "@/server/actions/contacts";
import type { ImportRow } from "@/types/contacts";
import { parseContactCSV, resolveContactHeader, validateContactHeaders, contactImportSchema, MAX_CONTACT_IMPORT_ROWS } from "@/lib/contact-import";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

const TEMPLATE_HEADERS = ["firstName", "lastName", "email", "phone", "jobTitle", "companyName"];
const TEMPLATE_ROWS = [
  ["Mario", "Rossi", "mario.rossi@esempio.it", "+39 02 1234567", "CEO", "Acme S.r.l."],
  ["Giulia", "Bianchi", "giulia.bianchi@esempio.it", "+39 335 9876543", "Direttore Commerciale", "Beta S.p.A."],
  ["Luca", "Verdi", "luca.verdi@esempio.it", "", "Account Manager", "Acme S.r.l."],
];

function parseXLSXBuffer(buffer: ArrayBuffer): ImportRow[] {
  const wb = XLSX.read(buffer, { type: "array", sheetRows: MAX_CONTACT_IMPORT_ROWS + 2 });
  const sheet = wb.Sheets[wb.SheetNames[0]!];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "", raw: false, blankrows: false });
  const headers = (rows.shift() ?? []).map(resolveContactHeader);
  validateContactHeaders(headers);
  return rows.map((row) => Object.fromEntries(headers.map((header, i) => [header, String(row[i] ?? "").trim()])));
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_ROWS]);
  ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 26 }));
  XLSX.utils.book_append_sheet(wb, ws, "Contatti");
  XLSX.writeFile(wb, "template_contatti.xlsx");
}

export function ImportCSVModal({ open, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; duplicates: number; companies?: number } | null>(null);
  const parsedRowsRef = useRef<ImportRow[]>([]);

  async function handleFile(file: File) {
    if (loading) return;
    setLoading(true);
    setFileName(""); setRowCount(0); setPreview([]); setResult(null);
    parsedRowsRef.current = [];
    try {
      if (!/\.(csv|tsv|xlsx|xls)$/i.test(file.name)) throw new Error("Seleziona un file CSV, TSV o Excel");
      if (file.size > 5 * 1024 * 1024) throw new Error("Il file supera il limite di 5 MB");
      const rows = /\.(xlsx|xls)$/i.test(file.name)
        ? parseXLSXBuffer(await file.arrayBuffer())
        : parseContactCSV(await file.text());
      const parsed = contactImportSchema.safeParse(rows);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const position = typeof issue?.path[0] === "number" ? `Riga ${issue.path[0] + 2}: ` : "";
        throw new Error(`${position}${issue?.message ?? "Dati non validi"}`);
      }
      parsedRowsRef.current = rows;
      setFileName(file.name);
      setRowCount(rows.length);
      setPreview(rows.slice(0, 5));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossibile leggere il file");
    } finally { setLoading(false); }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    const rows = parsedRowsRef.current;
    if (!rows.length) return;
    setLoading(true);
    try {
      const res = await importContacts(contactImportSchema.parse(rows));
      if (res.error) toast.error(res.error);
      else {
        setResult({ imported: res.imported, duplicates: res.duplicates, companies: res.companies });
        toast.success(`Importati ${res.imported} contatti`);
        onImported();
      }
    } catch { toast.error("Importazione non riuscita. Riprova."); }
    finally { setLoading(false); }
  }

  function handleClose() {
    if (loading) return;
    setPreview([]);
    setFileName("");
    setRowCount(0);
    setResult(null);
    parsedRowsRef.current = [];
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  }

  const previewHeaders = preview.length > 0 ? Object.keys(preview[0]!) : [];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Importa contatti</SheetTitle>
        </SheetHeader>

        <SheetBody>
          <div className="space-y-5">

            {/* Info + template download */}
            <div className="rounded-xl border border-[var(--crm-neutral-100)] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Colonne supportate</p>
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--crm-primary)] hover:underline"
                >
                  <Download className="h-3.5 w-3.5" /> Scarica template Excel
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["firstName *", "lastName", "email", "phone", "jobTitle", "companyName"].map((h) => (
                  <span
                    key={h}
                    className={`rounded-md px-2 py-0.5 text-xs font-mono ${h.endsWith("*") ? "bg-red-50 text-red-600 border border-red-200" : "bg-[var(--crm-neutral-50)] text-[var(--crm-neutral-600)] border border-[var(--crm-neutral-200)]"}`}
                  >
                    {h}
                  </span>
                ))}
              </div>
              <p className="text-xs text-[var(--crm-neutral-400)]">
                Intestazioni in italiano o inglese. CSV con virgola o punto e virgola, TSV ed Excel. Massimo 2.000 contatti e 5 MB. Le righe non valide vengono segnalate prima dell&apos;importazione.
              </p>
            </div>

            {!result && (
              <>
                {/* Drop zone */}
                <div
                  onDrop={onDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--crm-neutral-200)] p-8 cursor-pointer hover:border-[var(--crm-primary)] transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {fileName ? (
                    <>
                      <FileSpreadsheet className="h-8 w-8 text-[var(--crm-primary)] mb-2" />
                      <p className="text-sm font-medium text-[var(--crm-neutral-800)]">{fileName}</p>
                      <p className="text-xs text-[var(--crm-neutral-400)] mt-1">{rowCount} righe rilevate · clicca per cambiare file</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-[var(--crm-neutral-400)] mb-2" />
                      <p className="text-sm font-medium">Trascina il file qui</p>
                      <p className="text-xs text-[var(--crm-neutral-400)] mt-1">oppure clicca per scegliere</p>
                      <p className="text-xs text-[var(--crm-neutral-300)] mt-2">CSV · XLS · XLSX</p>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.tsv,.xls,.xlsx"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>

                {/* Preview table */}
                {preview.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Anteprima (prime {preview.length} righe)</p>
                    <div className="overflow-x-auto rounded-lg border border-[var(--crm-neutral-100)]">
                      <table className="w-full text-xs">
                        <thead className="bg-[var(--crm-neutral-50)] dark:bg-white/5">
                          <tr>
                            {previewHeaders.map((h) => (
                              <th key={h} className="px-3 py-2 text-left font-medium text-[var(--crm-neutral-600)] whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((row, i) => (
                            <tr key={i} className="border-t border-[var(--crm-neutral-100)]">
                              {previewHeaders.map((h) => (
                                <td key={h} className="px-3 py-2 text-[var(--crm-neutral-700)] truncate max-w-[120px]">{row[h] as string}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {result && (
              <div className="rounded-xl border border-[var(--crm-neutral-100)] p-6 space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">{result.imported} contatti importati</span>
                </div>
                {(result.companies ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">{result.companies} aziende create/collegate automaticamente</span>
                  </div>
                )}
                {result.duplicates > 0 && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="h-5 w-5" />
                    <span>{result.duplicates} duplicati saltati (email già presente)</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetBody>

        <div className="px-6 py-4 border-t border-[var(--crm-neutral-100)] dark:border-white/10 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
            {result ? "Chiudi" : "Annulla"}
          </Button>
          {!result && (
            <Button
              type="button"
              disabled={!fileName || loading}
              className="flex-1 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
              onClick={handleImport}
            >
              {loading ? "Importazione..." : `Importa${rowCount > 0 ? ` ${rowCount} contatti` : ""}`}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
