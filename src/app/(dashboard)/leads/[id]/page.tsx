import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Mail, Phone, User, Calendar, Tag, Zap, ExternalLink,
  ArrowRightCircle, StickyNote,
} from "lucide-react";
import { getLeadDetail } from "@/server/actions/leads";
import { LeadDetailClient } from "@/components/leads/LeadDetailClient";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";

type Props = { params: Promise<{ id: string }> };

const STATUS_LABEL: Record<string, string> = {
  NEW: "Nuovo",
  WORKING: "In lavorazione",
  NURTURING: "Nurturing",
  CONVERTED: "Convertito",
  DISQUALIFIED: "Scartato",
};
const STATUS_COLOR: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700 border-blue-200",
  WORKING: "bg-amber-100 text-amber-700 border-amber-200",
  NURTURING: "bg-purple-100 text-purple-700 border-purple-200",
  CONVERTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  DISQUALIFIED: "bg-rose-100 text-rose-700 border-rose-200",
};

const SOURCE_LABEL: Record<string, string> = {
  WEBSITE: "Sito web", REFERRAL: "Referral", LINKEDIN: "LinkedIn",
  COLD_EMAIL: "Cold email", COLD_CALL: "Cold call", EVENT: "Evento",
  ADS: "Ads", ORGANIC: "Organico", OTHER: "Altro",
};

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const lead = await getLeadDetail(id);
  if (!lead) notFound();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <Breadcrumb items={[{ label: "Lead", href: "/leads" }, { label: lead.title }]} />

      {/* Header */}
      <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
            <Zap className="h-7 w-7 text-[var(--crm-primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{lead.title}</h1>
              <span className={`text-xs rounded-full border px-2.5 py-0.5 font-medium ${STATUS_COLOR[lead.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                {STATUS_LABEL[lead.status] ?? lead.status}
              </span>
              {lead.score > 0 && (
                <span className="text-xs font-semibold bg-[var(--crm-primary)]/10 text-[var(--crm-primary)] px-2.5 py-0.5 rounded-full">
                  Score {lead.score}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-[var(--crm-neutral-500)]">
              {lead.source && (
                <span className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" /> {SOURCE_LABEL[lead.source] ?? lead.source}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(lead.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
          {lead.status !== "CONVERTED" && lead.status !== "DISQUALIFIED" && (
            <LeadDetailClient lead={lead} />
          )}
          {lead.convertedDealId && (
            <Link
              href={`/deals/${lead.convertedDealId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <ExternalLink className="h-4 w-4" /> Vedi affare
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: info */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)]">Informazioni</h2>
            {lead.email && (
              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-[var(--crm-neutral-400)] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-[var(--crm-neutral-400)]">Email</p>
                  <a href={`mailto:${lead.email}`} className="text-sm text-[var(--crm-primary)] hover:underline break-all">{lead.email}</a>
                </div>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-[var(--crm-neutral-400)] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-[var(--crm-neutral-400)]">Telefono</p>
                  <div className="flex items-center gap-2">
                    <a href={`tel:${lead.phone}`} className="text-sm text-[var(--crm-primary)] hover:underline">{lead.phone}</a>
                    <WhatsAppButton phone={lead.phone} contactName={lead.title.split(" ")[0]} variant="icon" />
                  </div>
                </div>
              </div>
            )}
            {lead.owner && (
              <div className="flex items-start gap-2.5">
                <User className="h-4 w-4 text-[var(--crm-neutral-400)] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-[var(--crm-neutral-400)]">Owner</p>
                  <p className="text-sm">{lead.owner.name ?? lead.owner.email}</p>
                </div>
              </div>
            )}
            {lead.contact && (
              <div className="flex items-start gap-2.5">
                <User className="h-4 w-4 text-[var(--crm-neutral-400)] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-[var(--crm-neutral-400)]">Contatto collegato</p>
                  <Link href={`/contacts/${lead.contact.id}`} className="text-sm text-[var(--crm-primary)] hover:underline">
                    {lead.contact.firstName} {lead.contact.lastName ?? ""}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic data fields from lead.data */}
          {lead.data && Object.keys(lead.data).length > 0 && (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)]">Dati aggiuntivi</h2>
              {Object.entries(lead.data).filter(([, v]) => v !== null && v !== "").map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-[var(--crm-neutral-400)] uppercase tracking-wide">{k}</p>
                  <p className="text-sm mt-0.5 break-words">{String(v)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: note */}
        <div className="lg:col-span-2">
          {lead.notes && (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)] flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-[var(--crm-primary)]" /> Note
              </h2>
              <p className="text-sm whitespace-pre-wrap text-[var(--crm-neutral-800)] dark:text-white/90 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg px-4 py-3">
                {lead.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
