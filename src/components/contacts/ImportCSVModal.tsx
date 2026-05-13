"use client";

import { useRef, useState } from "react";
import { Upload, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { importContacts } from "@/server/actions/contacts";
import type { ImportRow } from "@/types/contacts";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

const REQUIRED_HEADERS = ["firstName"];
const OPTIONAL_HEADERS = ["lastName", "email", "phone", "jobTitle", "companyName"];
const ALL_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

function normalizeRow(row: ImportRow): { firstName: string; lastName?: string; email?: string; phone?: string; jobTitle?: string; companyName?: string } | null {
  const firstName = row["firstname"] || row["nome"] || row["first_name"] || row["firstName"];
  if (!firstName) return null;
  return {
    firstName,
    lastName: row["lastname"] || row["cognome"] || row["last_name"] || row["lastName"],
    email: row["email"] || row["mail"],
    phone: row["phone"] || row["telefono"] || row["tel"],
    jobTitle: row["jobtitle"] || row["ruolo"] || row["title"] || row["jobTitle"],
    companyName: row["company"] || row["azienda"] || row["companyname"] || row["companyName"],
  };
}

export function ImportCSVModal({ open, onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; duplicates: number } | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    const text = await file.text();
    const rows = parseCSV(text);
    const normalized = rows.map(normalizeRow).filter((r): r is NonNullable<typeof r> => r !== null);
    const res = await importContacts(normalized);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      setResult({ imported: res.imported, duplicates: res.duplicates });
      toast.success(`Importati ${res.imported} contatti`);
    }
  }

  function handleClose() {
    setPreview([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
    if (result) onImported();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Importa contatti CSV</SheetTitle>
        </SheetHeader>

        <SheetBody>
        <div className="space-y-5">
          <div className="rounded-lg border border-dashed border-[var(--crm-neutral-200)] p-4 text-sm text-[var(--crm-neutral-500)]">
            <p className="font-medium mb-1">Colonne supportate:</p>
            <p className="text-xs">
              <span className="text-[var(--crm-danger)]">firstName</span> (obbligatorio),{" "}
              {OPTIONAL_HEADERS.join(", ")}
            </p>
            <p className="text-xs mt-1 text-[var(--crm-neutral-400)]">Vengono accettati anche: nome, cognome, email, telefono, ruolo, azienda</p>
          </div>

          {!result && (
            <>
              <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--crm-neutral-200)] p-8 cursor-pointer hover:border-[var(--crm-primary)] transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-[var(--crm-neutral-400)] mb-2" />
                <p className="text-sm font-medium">{fileName || "Trascina il file CSV qui"}</p>
                <p className="text-xs text-[var(--crm-neutral-400)] mt-1">oppure clicca per scegliere</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>

              {preview.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Anteprima (prime 5 righe)</p>
                  <div className="overflow-x-auto rounded-lg border border-[var(--crm-neutral-100)]">
                    <table className="w-full text-xs">
                      <thead className="bg-[var(--crm-neutral-50)]">
                        <tr>
                          {Object.keys(preview[0]!).map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-medium text-[var(--crm-neutral-600)]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-t border-[var(--crm-neutral-100)]">
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="px-3 py-2 text-[var(--crm-neutral-700)] truncate max-w-[120px]">{v}</td>
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
              <div className="flex items-center gap-2 text-[var(--crm-success)]">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">{result.imported} contatti importati</span>
              </div>
              {result.duplicates > 0 && (
                <div className="flex items-center gap-2 text-[var(--crm-warning)]">
                  <AlertCircle className="h-5 w-5" />
                  <span>{result.duplicates} duplicati saltati</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
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
                {loading ? "Importazione..." : "Importa"}
              </Button>
            )}
          </div>
        </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
