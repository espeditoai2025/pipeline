import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, Building2, Calendar, Trophy, X as LostIcon,
  Tag, TrendingUp, ExternalLink, Mail, Phone, StickyNote,
} from "lucide-react";
import { getDealDetail } from "@/server/actions/deals";
import { getPipeline } from "@/server/actions/pipeline";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";
import { DealProductsManager } from "@/components/products/DealProductsManager";
import { DealDetailActions } from "@/components/pipeline/DealDetailActions";
import { DealNotePanel } from "@/components/pipeline/DealNotePanel";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

type Props = { params: Promise<{ id: string }> };

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Aperto", WON: "Vinto", LOST: "Perso",
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700 border-blue-200",
  WON: "bg-emerald-100 text-emerald-700 border-emerald-200",
  LOST: "bg-rose-100 text-rose-700 border-rose-200",
};

export default async function DealDetailPage({ params }: Props) {
  const { id } = await params;
  const [deal, pipeline] = await Promise.all([getDealDetail(id), getPipeline()]);
  if (!deal) notFound();
  const stages = pipeline?.stages ?? [];

  const valueFormatted = deal.value.toLocaleString("it-IT", {
    style: "currency",
    currency: deal.currency,
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <Breadcrumb items={[{ label: "Pipeline", href: "/deals" }, { label: deal.title }]} />

      {/* Header */}
      <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
            {deal.status === "WON" ? (
              <Trophy className="h-7 w-7 text-emerald-500" />
            ) : deal.status === "LOST" ? (
              <LostIcon className="h-7 w-7 text-rose-500" />
            ) : (
              <TrendingUp className="h-7 w-7 text-[var(--crm-primary)]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{deal.title}</h1>
              <span className={`text-xs rounded-full border px-2.5 py-0.5 font-medium ${STATUS_COLOR[deal.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                {STATUS_LABEL[deal.status] ?? deal.status}
              </span>
              <DealDetailActions
                deal={{ ...deal, daysInStage: 0 } as import("@/types/deals").Deal}
                stages={stages as import("@/types/deals").Stage[]}
                pipelineId={deal.pipelineId}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-[var(--crm-neutral-500)]">
              <span className="font-semibold text-[var(--crm-neutral-800)] dark:text-white">{valueFormatted}</span>
              {deal.stage && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" /> {deal.stage.name}
                  </span>
                </>
              )}
              {deal.expectedClose && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Chiusura {new Date(deal.expectedClose).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: info */}
        <div className="space-y-4">
          {/* Dettagli */}
          <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)]">Informazioni</h2>
            <InfoRow icon={TrendingUp} label="Valore" value={valueFormatted} />
            <InfoRow icon={Tag} label="Stage" value={deal.stage?.name ?? null} />
            <InfoRow icon={User} label="Owner" value={deal.owner.name ?? deal.owner.email} />
            {deal.expectedClose && (
              <InfoRow
                icon={Calendar}
                label="Chiusura prevista"
                value={new Date(deal.expectedClose).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
              />
            )}
            {deal.status === "LOST" && deal.lostReason && (
              <InfoRow icon={LostIcon} label="Motivo perdita" value={deal.lostReason} />
            )}
            <InfoRow
              icon={Calendar}
              label="Creato"
              value={new Date(deal.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
            />
          </div>

          {/* Contatto */}
          {deal.contact && (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)]">Contatto</h2>
              <Link
                href={`/contacts/${deal.contact.id}`}
                className="flex items-center gap-3 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2.5 hover:bg-[var(--crm-neutral-50)] transition-colors group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--crm-primary)]/10 text-sm font-bold text-[var(--crm-primary)]">
                  {deal.contact.firstName[0]}{deal.contact.lastName?.[0] ?? ""}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium group-hover:text-[var(--crm-primary)]">
                    {deal.contact.firstName} {deal.contact.lastName ?? ""}
                  </p>
                  {deal.contact.email && (
                    <p className="text-xs text-[var(--crm-neutral-400)] truncate">{deal.contact.email}</p>
                  )}
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-[var(--crm-neutral-300)] shrink-0" />
              </Link>
              {deal.contact.email && (
                <a href={`mailto:${deal.contact.email}`} className="flex items-center gap-2 text-sm text-[var(--crm-primary)] hover:underline">
                  <Mail className="h-3.5 w-3.5" /> {deal.contact.email}
                </a>
              )}
              {deal.contact.phone && (
                <a href={`tel:${deal.contact.phone}`} className="flex items-center gap-2 text-sm text-[var(--crm-primary)] hover:underline">
                  <Phone className="h-3.5 w-3.5" /> {deal.contact.phone}
                </a>
              )}
            </div>
          )}

          {/* Azienda */}
          {deal.company && (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-2">
              <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)]">Azienda</h2>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[var(--crm-neutral-400)]" />
                <span className="text-sm">{deal.company.name}</span>
              </div>
              {deal.company.website && (
                <a href={deal.company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[var(--crm-primary)] hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> {deal.company.website}
                </a>
              )}
            </div>
          )}

          {/* Custom fields */}
          {deal.customValues.length > 0 && (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)]">Campi personalizzati</h2>
              {deal.customValues.map((cv) => (
                <div key={cv.fieldId}>
                  <p className="text-xs text-[var(--crm-neutral-400)] uppercase tracking-wide">{cv.fieldName}</p>
                  <p className="text-sm mt-0.5">
                    {cv.fieldType === "boolean"
                      ? cv.value === "true" ? "Sì" : "No"
                      : cv.fieldType === "date"
                      ? new Date(cv.value).toLocaleDateString("it-IT")
                      : cv.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: prodotti + note + timeline */}
        <div className="lg:col-span-2 space-y-4">
          <DealProductsManager dealId={deal.id} />

          <DealNotePanel dealId={deal.id} initialNotes={deal.notes} />

          <ActivityTimeline
            activities={deal.activities}
            entityId={deal.id}
            entityType="deal"
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-[var(--crm-neutral-400)] mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-[var(--crm-neutral-400)]">{label}</p>
        {href ? (
          <a href={href} className="text-sm text-[var(--crm-primary)] hover:underline break-all">{value}</a>
        ) : (
          <p className="text-sm break-words">{value}</p>
        )}
      </div>
    </div>
  );
}
