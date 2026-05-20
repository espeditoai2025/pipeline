import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Globe, Mail, Phone, MapPin, User,
  Users, Briefcase, ExternalLink, Tag, FileText,
} from "lucide-react";
import { getCompanyDetail } from "@/server/actions/contacts";
import { CompanyDetailActions } from "@/components/companies/CompanyDetailActions";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

type Props = { params: Promise<{ id: string }> };

const STATUS_LABEL: Record<string, string> = { OPEN: "Aperto", WON: "Vinto", LOST: "Perso" };
const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  WON: "bg-emerald-100 text-emerald-700",
  LOST: "bg-rose-100 text-rose-700",
};

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params;
  const company = await getCompanyDetail(id);
  if (!company) notFound();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <Breadcrumb items={[{ label: "Aziende", href: "/companies" }, { label: company.name }]} />

      {/* Header */}
      <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10 text-2xl font-bold text-[var(--crm-primary)]">
            {company.name[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{company.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-[var(--crm-neutral-500)]">
              {company.industry && (
                <span className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" /> {company.industry}
                </span>
              )}
              {company.size && <span>{company.size}</span>}
              {company.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {company.city}{company.country ? `, ${company.country}` : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <CompanyDetailActions company={company as import("@/types/contacts").Company} />
            {company.email && (
              <a href={`mailto:${company.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--crm-neutral-200)] px-3 py-2 text-sm hover:bg-[var(--crm-neutral-50)] transition-colors">
                <Mail className="h-4 w-4 text-[var(--crm-neutral-400)]" /> Email
              </a>
            )}
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--crm-neutral-200)] px-3 py-2 text-sm hover:bg-[var(--crm-neutral-50)] transition-colors">
                <Globe className="h-4 w-4 text-[var(--crm-neutral-400)]" /> Sito
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: info */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)]">Informazioni</h2>
            <InfoRow icon={Building2} label="Nome" value={company.name} />
            {company.website && (
              <InfoRow icon={Globe} label="Sito web" value={company.website} href={company.website} />
            )}
            <InfoRow icon={Mail} label="Email" value={company.email} href={company.email ? `mailto:${company.email}` : undefined} />
            <InfoRow icon={Phone} label="Telefono" value={company.phone} href={company.phone ? `tel:${company.phone}` : undefined} />
            <InfoRow icon={Tag} label="Settore" value={company.industry} />
            <InfoRow icon={Users} label="Dimensione" value={company.size} />
            <InfoRow icon={FileText} label="P.IVA" value={company.vatNumber} />
            <InfoRow icon={MapPin} label="Indirizzo" value={[company.address, company.city, company.country].filter(Boolean).join(", ") || null} />
            {company.linkedinUrl && (
              <InfoRow icon={ExternalLink} label="LinkedIn" value={company.linkedinUrl} href={company.linkedinUrl} />
            )}
            <InfoRow
              icon={Building2}
              label="Creata"
              value={new Date(company.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
            />
          </div>

          {/* Referente */}
          {company.referentName && (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)]">Referente</h2>
              <InfoRow icon={User} label="Nome" value={company.referentName} />
              <InfoRow icon={Tag} label="Ruolo" value={company.referentRole} />
              <InfoRow icon={Mail} label="Email" value={company.referentEmail} href={company.referentEmail ? `mailto:${company.referentEmail}` : undefined} />
              <InfoRow icon={Phone} label="Telefono" value={company.referentPhone} href={company.referentPhone ? `tel:${company.referentPhone}` : undefined} />
            </div>
          )}

          {/* Descrizione */}
          {company.description && (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-2">
              <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)]">Descrizione</h2>
              <p className="text-sm text-[var(--crm-neutral-700)] dark:text-white/80 leading-relaxed whitespace-pre-wrap">
                {company.description}
              </p>
            </div>
          )}
        </div>

        {/* Right: contacts + deals */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contacts */}
          <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)] flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--crm-primary)]" />
              Contatti ({company.contacts.length})
            </h2>
            {company.contacts.length === 0 ? (
              <p className="text-sm text-[var(--crm-neutral-400)] text-center py-4">Nessun contatto associato</p>
            ) : (
              <div className="space-y-2">
                {company.contacts.map((ct) => (
                  <Link
                    key={ct.id}
                    href={`/contacts/${ct.id}`}
                    className="flex items-center gap-3 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2.5 hover:bg-[var(--crm-neutral-50)] transition-colors group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--crm-primary)]/10 text-sm font-bold text-[var(--crm-primary)]">
                      {ct.firstName[0]}{ct.lastName?.[0] ?? ""}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium group-hover:text-[var(--crm-primary)]">
                        {ct.firstName} {ct.lastName ?? ""}
                      </p>
                      {ct.jobTitle && <p className="text-xs text-[var(--crm-neutral-400)]">{ct.jobTitle}</p>}
                      {ct.email && <p className="text-xs text-[var(--crm-neutral-400)] truncate">{ct.email}</p>}
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-[var(--crm-neutral-300)] shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Deals */}
          <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)] flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[var(--crm-primary)]" />
              Affari ({company.deals.length})
            </h2>
            {company.deals.length === 0 ? (
              <p className="text-sm text-[var(--crm-neutral-400)] text-center py-4">Nessun affare associato</p>
            ) : (
              <div className="space-y-2">
                {company.deals.map((d) => (
                  <Link
                    key={d.id}
                    href={`/deals/${d.id}`}
                    className="flex items-center justify-between rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2.5 hover:bg-[var(--crm-neutral-50)] transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-[var(--crm-primary)]">{d.title}</p>
                      {d.stageName && <p className="text-xs text-[var(--crm-neutral-400)]">{d.stageName}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLOR[d.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[d.status] ?? d.status}
                      </span>
                      <span className="text-xs font-semibold text-[var(--crm-neutral-700)]">
                        {d.value.toLocaleString("it-IT", { style: "currency", currency: d.currency })}
                      </span>
                      <ExternalLink className="h-3 w-3 text-[var(--crm-neutral-300)]" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
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
          <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-sm text-[var(--crm-primary)] hover:underline break-all">{value}</a>
        ) : (
          <p className="text-sm break-words">{value}</p>
        )}
      </div>
    </div>
  );
}
