"use client";

import { useRef, useState } from "react";
import { Upload, AlertCircle, CheckCircle2, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { importContacts } from "@/server/actions/contacts";
import type { ImportRow } from "@/types/contacts";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

// Column aliases accepted for each field
const ALIASES: Record<string, string[]> = {
  firstName:   ["firstname", "nome", "first_name", "firstname", "name"],
  lastName:    ["lastname", "cognome", "last_name", "lastname", "surname"],
  email:       ["email", "mail", "e-mail"],
  phone:       ["phone", "telefono", "tel", "cellulare", "mobile"],
  jobTitle:    ["jobtitle", "ruolo", "title", "job_title", "posizione"],
  companyName: ["company", "azienda", "companyname", "company_name", "ragionesociale"],
};

const TEMPLATE_HEADERS = ["firstName", "lastName", "email", "phone", "jobTitle", "companyName"];
const TEMPLATE_SAMPLE  = ["Mario", "Rossi", "mario.rossi@esempio.it", "+39 02 1234567", "CEO", "Acme S.r.l."];

function resolveHeader(raw: string): string {
  const norm = raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
  for (const [field, aliases] of Object.entries(ALIASES)) {
    if (aliases.some((a) => a.replace(/[\s_-]+/g, "") === norm)) return field;
  }
  return raw.trim();
}

function parseCSVText(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map(resolveHeader);
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])) as ImportRow;
  });
}

function parseXLSXBuffer(buffer: ArrayBuffer): ImportRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]!];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rows.map((r) => {
    const out: ImportRow = {};
    for (const [rawKey, val] of Object.entries(r)) {
      out[resolveHeader(rawKey)] = String(val ?? "").trim();
    }
    return out;
  });
}

function normalizeRow(row: ImportRow) {
  const firstName = row["firstName"] as string | undefined;
  if (!firstName) return null;
  return {
    firstName,
    lastName:    (row["lastName"]    as string) || undefined,
    email:       (row["email"]       as string) || undefined,
    phone:       (row["phone"]       as string) || undefined,
    jobTitle:    (row["jobTitle"]    as string) || undefined,
    companyName: (row["companyName"] as string) || undefined,
  };
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_SAMPLE]);

  // Column widths
  ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 22 }));

  XLSX.utils.book_append_sheet(wb, ws, "Contatti");
  XLSX.writeFile(wb, "template_contatti.xlsx");
}

export function ImportCSVModal({ open, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; duplicates: number } | null>(null);
  const parsedRowsRef = useRef<ImportRow[]>([]);

  async function handleFile(file: File) {
    setFileName(file.name);
    let rows: ImportRow[] = [];

    if (/\.(xlsx|xls)$/i.test(file.name)) {
      const buffer = await file.arrayBuffer();
      rows = parseXLSXBuffer(buffer);
    } else {
      const text = await file.text();
      rows = parseCSVText(text);
    }

    parsedRowsRef.current = rows;
    setRowCount(rows.length);
    setPreview(rows.slice(0, 5));
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
    const normalized = rows.map(normalizeRow).filter((r): r is NonNullable<typeof r> => r !== null);
    const res = await importContacts(normalized);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      setResult({ imported: res.imported, duplicates: res.duplicates });
      toast.success(`Importati ${res.imported} contatti`);
      onImported();
    }
  }

  function handleClose() {
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
                Accetta anche: nome, cognome, telefono, ruolo, azienda — sia in italiano che in inglese
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
                    accept=".csv,.xls,.xlsx"
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
                {result.duplicates > 0 && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="h-5 w-5" />
                    <span>{result.duplicates} duplicati saltati</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetBody>

        <div className="px-6 py-4 border-t border-[var(--crm-neutral-100)] dark:border-white/10 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
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
