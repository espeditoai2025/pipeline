"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, X, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { importLeads } from "@/server/actions/leads";
import type { Lead } from "@/types/contacts";

// Mappa intestazioni colonne → campi Lead (case-insensitive)
const COL_MAP: Record<string, string> = {
  nome: "title", azienda: "title", "ragione sociale": "title", title: "title", company: "title",
  email: "email",
  telefono: "phone", phone: "phone", tel: "phone",
  sorgente: "source", source: "source",
  stato: "status", status: "status",
  score: "score", punteggio: "score",
  note: "notes", notes: "notes",
  settore: "sector", sector: "sector",
  "localita": "location", "località": "location", citta: "location", city: "location", location: "location",
  sito: "website", website: "website", "sito web": "website",
  piva: "piva", "p.iva": "piva", "partita iva": "piva",
  ateco: "ateco",
  dipendenti: "nDipendenti", "n. dipendenti": "nDipendenti",
  "forma giuridica": "formaGiuridica",
  "anno fondazione": "annoFondazione",
};

const STATUS_MAP: Record<string, string> = {
  nuovo: "NEW", new: "NEW",
  "in lavorazione": "WORKING", working: "WORKING", contattato: "WORKING",
  nurturing: "NURTURING", qualificato: "NURTURING",
  convertito: "CONVERTED", converted: "CONVERTED",
  "non qualificato": "DISQUALIFIED", disqualified: "DISQUALIFIED", scartato: "DISQUALIFIED",
};

type ParsedRow = {
  title: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: string;
  score?: number;
  notes?: string;
  data?: Record<string, unknown>;
  _valid: boolean;
};

function parseSheet(wb: XLSX.WorkBook): ParsedRow[] {
  const ws = wb.Sheets[wb.SheetNames[0]!];
  if (!ws) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  if (!raw.length) return [];

  return raw.map((row) => {
    const mapped: Record<string, unknown> = {};
    for (const [rawKey, val] of Object.entries(row)) {
      const key = rawKey.trim().toLowerCase();
      const field = COL_MAP[key];
      if (field) mapped[field] = String(val ?? "").trim();
    }

    const title = (mapped.title as string) ?? "";
    const scoreRaw = mapped.score ? Number(mapped.score) : NaN;
    const statusRaw = (mapped.status as string ?? "").toLowerCase();
    const extra: Record<string, unknown> = {};
    for (const f of ["sector", "location", "website", "piva", "ateco", "nDipendenti", "formaGiuridica", "annoFondazione"]) {
      if (mapped[f]) extra[f] = mapped[f];
    }

    return {
      title,
      email: (mapped.email as string) || undefined,
      phone: (mapped.phone as string) || undefined,
      source: (mapped.source as string) || undefined,
      status: STATUS_MAP[statusRaw] ?? (statusRaw ? "NEW" : undefined),
      score: isNaN(scoreRaw) ? undefined : scoreRaw,
      notes: (mapped.notes as string) || undefined,
      data: Object.keys(extra).length ? extra : undefined,
      _valid: title.length > 0,
    };
  });
}

function downloadTemplate() {
  const template = [
    {
      "Nome": "Esempio Srl",
      "Email": "info@esempio.it",
      "Telefono": "+39 02 1234567",
      "Sorgente": "LinkedIn",
      "Stato": "Nuovo",
      "Score": 75,
      "Note": "Contattato alla fiera di Milano",
      "Settore": "Produzione alimentare",
      "Località": "Milano, MI",
      "Sito Web": "www.esempio.it",
      "P.IVA": "01234567890",
      "ATECO": "10.51",
      "Dipendenti": "11-50",
      "Forma Giuridica": "S.R.L.",
      "Anno Fondazione": "2010",
    },
    {
      "Nome": "Mario Rossi Consulting",
      "Email": "mario@rossi.it",
      "Telefono": "+39 333 9876543",
      "Sorgente": "Referral",
      "Stato": "In lavorazione",
      "Score": 60,
      "Note": "",
      "Settore": "Consulenza",
      "Località": "Roma, RM",
      "Sito Web": "",
      "P.IVA": "",
      "ATECO": "",
      "Dipendenti": "1-10",
      "Forma Giuridica": "",
      "Anno Fondazione": "",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  ws["!cols"] = [
    { wch: 28 }, { wch: 26 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
    { wch: 7 },  { wch: 30 }, { wch: 24 }, { wch: 18 }, { wch: 24 },
    { wch: 14 }, { wch: 8 },  { wch: 10 }, { wch: 16 }, { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Lead");
  XLSX.writeFile(wb, "template_lead.xlsx", { bookType: "xlsx" });
}

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: (leads: Lead[]) => void;
};

export function LeadImportModal({ open, onClose, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  function handleFile(file: File) {
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const parsed = parseSheet(wb);
        setRows(parsed);
        setFileName(file.name);
      } catch {
        toast.error("Impossibile leggere il file. Assicurati che sia CSV o XLSX valido.");
      }
    };
    reader.readAsBinaryString(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleImport() {
    const valid = rows.filter((r) => r._valid);
    startTransition(async () => {
      const res = await importLeads(valid.map(({ _valid, ...r }) => r));
      if (res.error) { toast.error(res.error); return; }
      setResult({ created: res.created, skipped: res.skipped });
      toast.success(`${res.created} lead importati con successo`);
      onImported([]);
    });
  }

  function handleClose() {
    setRows([]);
    setFileName("");
    setResult(null);
    onClose();
  }

  if (!open) return null;

  const validCount = rows.filter((r) => r._valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--crm-neutral-100)] dark:border-white/10">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-[var(--crm-primary)]" />
            <h2 className="text-base font-semibold">Importa Lead</h2>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 hover:bg-[var(--crm-neutral-100)] dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Risultato importazione */}
          {result && (
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Importazione completata: {result.created} lead creati
                  {result.skipped > 0 && `, ${result.skipped} righe saltate (Nome mancante)`}
                </p>
              </div>
            </div>
          )}

          {/* Drop zone */}
          {!rows.length && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--crm-neutral-200)] dark:border-white/20 p-10 cursor-pointer hover:border-[var(--crm-primary)] hover:bg-[var(--crm-primary)]/5 transition-colors"
            >
              <Upload className="h-8 w-8 text-[var(--crm-neutral-400)]" />
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--crm-neutral-700)] dark:text-white">
                  Trascina qui il file o clicca per selezionarlo
                </p>
                <p className="text-xs text-[var(--crm-neutral-500)] mt-1">Formati supportati: CSV, XLSX, XLS</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          )}

          {/* Istruzioni colonne + scarica template */}
          {!rows.length && (
            <div className="rounded-xl bg-[var(--crm-neutral-50)] dark:bg-white/5 border border-[var(--crm-neutral-100)] dark:border-white/10 px-4 py-3 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold text-[var(--crm-neutral-600)] dark:text-[var(--crm-neutral-300)]">Intestazioni riconosciute automaticamente:</p>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700/40 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800/30 transition-colors shrink-0"
                >
                  <Download className="h-3.5 w-3.5" /> Scarica template XLSX
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["Nome*", "Email", "Telefono", "Sorgente", "Stato", "Score", "Note", "Settore", "Località", "Sito Web", "P.IVA", "ATECO", "Dipendenti"].map((col) => (
                  <span key={col} className="rounded-full bg-white dark:bg-white/10 border border-[var(--crm-neutral-200)] dark:border-white/10 px-2 py-0.5 text-xs text-[var(--crm-neutral-600)] dark:text-[var(--crm-neutral-300)]">
                    {col}
                  </span>
                ))}
              </div>
              <p className="text-xs text-[var(--crm-neutral-400)]">* obbligatorio — il template include 2 righe di esempio</p>
            </div>
          )}

          {/* Preview file caricato */}
          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium truncate">{fileName}</span>
                </div>
                <button
                  onClick={() => { setRows([]); setFileName(""); setResult(null); }}
                  className="text-xs text-[var(--crm-neutral-500)] hover:text-[var(--crm-danger)] underline shrink-0"
                >
                  Cambia file
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {validCount} righe valide
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> {invalidCount} righe senza Nome (verranno saltate)
                  </span>
                )}
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10">
                <table className="w-full min-w-[500px] text-xs">
                  <thead className="bg-[var(--crm-neutral-50)] dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide">Nome</th>
                      <th className="px-3 py-2 text-left font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide">Email</th>
                      <th className="px-3 py-2 text-left font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide">Telefono</th>
                      <th className="px-3 py-2 text-left font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide">Sorgente</th>
                      <th className="px-3 py-2 text-left font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide">Stato</th>
                      <th className="px-3 py-2 text-left font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 8).map((row, i) => (
                      <tr key={i} className={`border-t border-[var(--crm-neutral-100)] dark:border-white/10 ${!row._valid ? "opacity-40" : ""}`}>
                        <td className="px-3 py-2 font-medium text-[var(--crm-neutral-900)] dark:text-white">{row.title || <span className="text-red-400 italic">mancante</span>}</td>
                        <td className="px-3 py-2 text-[var(--crm-neutral-500)]">{row.email ?? "—"}</td>
                        <td className="px-3 py-2 text-[var(--crm-neutral-500)]">{row.phone ?? "—"}</td>
                        <td className="px-3 py-2 text-[var(--crm-neutral-500)]">{row.source ?? "—"}</td>
                        <td className="px-3 py-2 text-[var(--crm-neutral-500)]">{row.status ?? "—"}</td>
                        <td className="px-3 py-2">
                          {row._valid
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            : <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 8 && (
                  <p className="px-3 py-2 text-xs text-[var(--crm-neutral-400)] border-t border-[var(--crm-neutral-100)] dark:border-white/10">
                    + altri {rows.length - 8} lead
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--crm-neutral-100)] dark:border-white/10">
          <button
            onClick={handleClose}
            className="rounded-lg border border-[var(--crm-neutral-200)] dark:border-white/10 px-4 py-2 text-sm font-medium hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors"
          >
            {result ? "Chiudi" : "Annulla"}
          </button>
          {rows.length > 0 && !result && (
            <button
              onClick={handleImport}
              disabled={isPending || validCount === 0}
              className="flex items-center gap-2 rounded-lg bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importa {validCount} lead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
