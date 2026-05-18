"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, ExternalLink, Loader2, Building2, User, MapPin, Users, Trash2, Phone, Hash, Briefcase, Calendar } from "lucide-react";
import { approveCandidate, rejectCandidate, rejectBelowScore } from "@/server/actions/lead-finder";
import type { LeadCandidate } from "@/types/lead-finder";

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--crm-neutral-100)] dark:bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-[var(--crm-neutral-700)] dark:text-white w-7 text-right">{score}</span>
    </div>
  );
}

function StatusBadge({ status, leadId }: { status: LeadCandidate["status"]; leadId: string | null }) {
  if (status === "APPROVED") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" /> Importato
        </span>
        {leadId && (
          <Link href={`/leads`} className="text-xs text-[var(--crm-primary)] hover:underline inline-flex items-center gap-0.5">
            Vedi lead <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--crm-neutral-100)] dark:bg-white/10 px-2 py-0.5 text-xs font-medium text-[var(--crm-neutral-500)]">
        <XCircle className="h-3 w-3" /> Rifiutato
      </span>
    );
  }
  return null;
}

function CandidateRow({ candidate }: { candidate: LeadCandidate }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [localStatus, setLocalStatus] = useState(candidate.status);
  const [localLeadId, setLocalLeadId] = useState(candidate.leadId);
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    startTransition(async () => {
      setError(null);
      const { leadId, error: err } = await approveCandidate(candidate.id);
      if (err) { setError(err); return; }
      setLocalStatus("APPROVED");
      setLocalLeadId(leadId);
      router.refresh();
    });
  }

  function handleReject() {
    startTransition(async () => {
      setError(null);
      const { error: err } = await rejectCandidate(candidate.id);
      if (err) { setError(err); return; }
      setLocalStatus("REJECTED");
    });
  }

  return (
    <tr className="border-b border-[var(--crm-neutral-100)] dark:border-white/10 hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors">
      {/* Azienda */}
      <td className="px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--crm-primary)]/10 mt-0.5">
            <Building2 className="h-4 w-4 text-[var(--crm-primary)]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white truncate">{candidate.companyName}</p>
            {candidate.website && (
              <a href={candidate.website.startsWith("http") ? candidate.website : `https://${candidate.website}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-[var(--crm-primary)] hover:underline inline-flex items-center gap-0.5 mt-0.5 truncate">
                {candidate.website} <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              </a>
            )}
          </div>
        </div>
      </td>

      {/* Info */}
      <td className="px-4 py-3">
        <div className="space-y-0.5">
          {candidate.sector && (
            <p className="text-xs text-[var(--crm-neutral-600)] dark:text-[var(--crm-neutral-300)]">{candidate.sector}</p>
          )}
          {candidate.location && (
            <p className="flex items-center gap-1 text-xs text-[var(--crm-neutral-500)]">
              <MapPin className="h-3 w-3" /> {candidate.location}
            </p>
          )}
          {candidate.phone && (
            <p className="flex items-center gap-1 text-xs text-[var(--crm-neutral-500)]">
              <Phone className="h-3 w-3" /> {candidate.phone}
            </p>
          )}
          {candidate.piva && (
            <p className="flex items-center gap-1 text-xs text-[var(--crm-neutral-500)]">
              <Hash className="h-3 w-3" /> P.IVA {candidate.piva}
            </p>
          )}
          {candidate.ateco && (
            <p className="flex items-center gap-1 text-xs text-[var(--crm-neutral-400)]">
              <Briefcase className="h-3 w-3" /> ATECO {candidate.ateco}
            </p>
          )}
          {(candidate.nDipendenti ?? candidate.companySize) && (
            <p className="flex items-center gap-1 text-xs text-[var(--crm-neutral-500)]">
              <Users className="h-3 w-3" /> {candidate.nDipendenti ?? candidate.companySize} dip.
            </p>
          )}
          {(candidate.formaGiuridica || candidate.annoFondazione) && (
            <p className="flex items-center gap-1 text-xs text-[var(--crm-neutral-400)]">
              <Calendar className="h-3 w-3" />
              {[candidate.formaGiuridica, candidate.annoFondazione ? `est. ${candidate.annoFondazione}` : null].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </td>

      {/* Referente */}
      <td className="px-4 py-3">
        {candidate.contactName ? (
          <div className="flex items-start gap-1.5">
            <User className="h-3.5 w-3.5 text-[var(--crm-neutral-400)] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--crm-neutral-900)] dark:text-white truncate">{candidate.contactName}</p>
              {candidate.contactRole && <p className="text-xs text-[var(--crm-neutral-500)] truncate">{candidate.contactRole}</p>}
              {candidate.email && <p className="text-xs text-[var(--crm-neutral-500)] truncate">{candidate.email}</p>}
            </div>
          </div>
        ) : (
          <span className="text-xs text-[var(--crm-neutral-400)]">—</span>
        )}
      </td>

      {/* Score */}
      <td className="px-4 py-3">
        <ScoreBar score={candidate.score} />
        {candidate.motivation && (
          <p className="text-xs text-[var(--crm-neutral-500)] mt-1 line-clamp-2 max-w-[180px]">{candidate.motivation}</p>
        )}
      </td>

      {/* Stato + Azioni */}
      <td className="px-4 py-3">
        {localStatus !== "PENDING" ? (
          <StatusBadge status={localStatus} leadId={localLeadId} />
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800/30 disabled:opacity-50 transition-colors"
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Approva
            </button>
            <button
              onClick={handleReject}
              disabled={isPending}
              className="flex items-center gap-1 rounded-lg bg-[var(--crm-neutral-50)] dark:bg-white/5 border border-[var(--crm-neutral-200)] dark:border-white/10 px-2.5 py-1.5 text-xs font-medium text-[var(--crm-neutral-600)] dark:text-[var(--crm-neutral-300)] hover:bg-[var(--crm-neutral-100)] dark:hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
              Rifiuta
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </td>
    </tr>
  );
}

type Props = {
  candidates: LeadCandidate[];
  searchId: string;
};

export function CandidatesTable({ candidates, searchId }: Props) {
  const router = useRouter();
  const [isBulkPending, startBulkTransition] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);

  const pending = candidates.filter((c) => c.status === "PENDING").length;
  const approved = candidates.filter((c) => c.status === "APPROVED").length;
  const rejected = candidates.filter((c) => c.status === "REJECTED").length;
  const lowScorePending = candidates.filter((c) => c.status === "PENDING" && c.score < 70).length;

  function handleRejectLowScore() {
    startBulkTransition(async () => {
      setBulkError(null);
      const { count, error } = await rejectBelowScore(searchId, 70);
      if (error) { setBulkError(error); return; }
      if (count > 0) router.refresh();
    });
  }

  if (candidates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--crm-neutral-200)] dark:border-white/10 p-12 text-center">
        <Building2 className="h-8 w-8 text-[var(--crm-neutral-300)] mx-auto mb-3" />
        <p className="text-sm font-medium text-[var(--crm-neutral-500)]">Nessun candidato trovato</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Totale", value: candidates.length, color: "text-[var(--crm-neutral-900)] dark:text-white" },
          { label: "Approvati", value: approved, color: "text-emerald-600" },
          { label: "Rifiutati", value: rejected, color: "text-[var(--crm-neutral-500)]" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        {pending > 0 && (
          <p className="text-xs text-[var(--crm-neutral-500)]">
            {pending} candidat{pending === 1 ? "o" : "i"} in attesa di revisione
          </p>
        )}
        {lowScorePending > 0 && (
          <button
            onClick={handleRejectLowScore}
            disabled={isBulkPending}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-700/40 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800/30 disabled:opacity-50 transition-colors"
          >
            {isBulkPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Trash2 className="h-3.5 w-3.5" />
            }
            Elimina risultati non pertinenti (score minore di 70)
          </button>
        )}
      </div>
      {bulkError && <p className="text-xs text-red-500">{bulkError}</p>}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--crm-neutral-100)] dark:border-white/10 bg-[var(--crm-neutral-50)] dark:bg-white/5">
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide">Azienda</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide">Info</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide">Referente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide">Score / Motivazione</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide">Azione</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <CandidateRow key={c.id} candidate={c} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
