import { Users } from "lucide-react";
import { MOCK_CONTACTS } from "@/lib/mock-contacts";
import { MOCK_COMPANIES } from "@/lib/mock-contacts";
import { ContactsTable } from "@/components/contacts/ContactsTable";

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
          <Users className="h-5 w-5 text-[var(--crm-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Contatti</h1>
          <p className="text-sm text-[var(--crm-neutral-500)]">{MOCK_CONTACTS.length} contatti totali</p>
        </div>
      </div>

      <ContactsTable initialContacts={MOCK_CONTACTS} companies={MOCK_COMPANIES} />
    </div>
  );
}
