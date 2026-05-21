import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Building2, Briefcase, Calendar, User, ExternalLink } from "lucide-react";
import { getContactDetail, getCompanies } from "@/server/actions/contacts";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";
import { ContactNotePanel } from "@/components/contacts/ContactNotePanel";
import { ContactDetailActions } from "@/components/contacts/ContactDetailActions";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";

type Props = { params: Promise<{ id: string }> };

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Aperto", WON: "Vinto", LOST: "Perso",
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  WON: "bg-emerald-100 text-emerald-700",
  LOST: "bg-rose-100 text-rose-700",
};

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params;
  const [contact, companies] = await Promise.all([getContactDetail(id), getCompanies()]);
  if (!contact) notFound();

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  const initials = [contact.firstName[0], contact.lastName?.[0]].filter(Boolean).join("").toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <Breadcrumb items={[{ label: "Contatti", href: "/contacts" }, { label: fullName }]} />

      {/* Header */}
      <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--crm-primary)]/10 text-2xl font-bold text-[var(--crm-primary)]">
            {initials || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{fullName}</h1>
            {contact.jobTitle && (
              <p className="text-sm text-[var(--crm-neutral-500)] mt-0.5">{contact.jobTitle}</p>
            )}
            {contact.company && (
              <Link
                href={`/companies/${contact.company.id}`}
                className="inline-flex items-center gap-1 text-sm text-[var(--crm-primary)] hover:underline mt-0.5"
              >
                <Building2 className="h-3.5 w-3.5" /> {contact.company.name}
              </Link>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <ContactDetailActions contact={contact} companies={companies} />
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--crm-neutral-200)] px-3 py-2 text-sm hover:bg-[var(--crm-neutral-50)] transition-colors"
              >
                <Mail className="h-4 w-4 text-[var(--crm-neutral-400)]" /> Email
              </a>
            )}
            {contact.phone && (
              <>
                <a
                  href={`tel:${contact.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--crm-neutral-200)] px-3 py-2 text-sm hover:bg-[var(--crm-neutral-50)] transition-colors"
                >
                  <Phone className="h-4 w-4 text-[var(--crm-neutral-400)]" /> Chiama
                </a>
                <WhatsAppButton phone={contact.phone} contactName={contact.firstName} />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: info */}
        <div className="space-y-4">
          {/* Dettagli */}
          <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)]">Informazioni</h2>
            <InfoRow icon={Mail} label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
            <InfoRow icon={Phone} label="Telefono" value={contact.phone} href={contact.phone ? `tel:${contact.phone}` : undefined} />
            <InfoRow icon={Briefcase} label="Ruolo" value={contact.jobTitle} />
            <InfoRow icon={Building2} label="Azienda" value={contact.company?.name ?? null} />
            <InfoRow icon={User} label="Owner" value={contact.owner.name ?? contact.owner.email} />
            <InfoRow
              icon={Calendar}
              label="Creato"
              value={new Date(contact.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
            />
          </div>

          {/* Custom fields */}
          {contact.customValues.length > 0 && (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)]">Campi personalizzati</h2>
              {contact.customValues.map((cv) => (
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

          {/* Affari */}
          <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)]">
                Affari ({contact.deals.length})
              </h2>
              <Link
                href={`/deals?newDeal=1&contactId=${contact.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--crm-neutral-200)] px-2.5 py-1.5 text-xs font-medium text-[var(--crm-neutral-600)] hover:bg-[var(--crm-neutral-50)] transition-colors"
              >
                <Briefcase className="h-3 w-3" /> Nuovo affare
              </Link>
            </div>
            {contact.deals.length === 0 ? (
              <p className="text-sm text-[var(--crm-neutral-400)] text-center py-4">
                Nessun affare collegato. Crea il primo affare per questo contatto.
              </p>
            ) : (
              <div className="space-y-2">
                {contact.deals.map((d) => (
                  <Link
                    key={d.id}
                    href={`/deals/${d.id}`}
                    className="flex items-center justify-between rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2.5 hover:bg-[var(--crm-neutral-50)] transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-[var(--crm-primary)]">{d.title}</p>
                      {d.stageName && (
                        <p className="text-xs text-[var(--crm-neutral-400)]">{d.stageName}</p>
                      )}
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

        {/* Right column: note + activity timeline */}
        <div className="lg:col-span-2 space-y-4">
          <ContactNotePanel contactId={contact.id} initialNotes={contact.notes} />
          <ActivityTimeline
            activities={contact.activities}
            entityId={contact.id}
            entityType="contact"
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
          <a href={href} className="text-sm text-[var(--crm-primary)] hover:underline break-all">
            {value}
          </a>
        ) : (
          <p className="text-sm break-words">{value}</p>
        )}
      </div>
    </div>
  );
}
