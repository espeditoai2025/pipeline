import { Users } from "lucide-react";
import { getContacts, getCompanies } from "@/server/actions/contacts";
import { ContactsTable } from "@/components/contacts/ContactsTable";

export default async function ContactsPage() {
  const [contacts, companies] = await Promise.all([getContacts(), getCompanies()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
          <Users className="h-5 w-5 text-[var(--crm-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Contatti</h1>
          <p className="text-sm text-[var(--crm-neutral-500)]">{contacts.length} contatti totali</p>
        </div>
      </div>

      <ContactsTable initialContacts={contacts} companies={companies} />
    </div>
  );
}
