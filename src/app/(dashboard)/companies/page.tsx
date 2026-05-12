import { Building2 } from "lucide-react";
import { MOCK_COMPANIES } from "@/lib/mock-contacts";
import { CompaniesTable } from "@/components/companies/CompaniesTable";

export default function CompaniesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
          <Building2 className="h-5 w-5 text-[var(--crm-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Aziende</h1>
          <p className="text-sm text-[var(--crm-neutral-500)]">{MOCK_COMPANIES.length} aziende totali</p>
        </div>
      </div>

      <CompaniesTable initialCompanies={MOCK_COMPANIES} />
    </div>
  );
}
