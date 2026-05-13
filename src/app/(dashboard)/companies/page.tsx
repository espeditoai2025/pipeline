import { Building2 } from "lucide-react";
import { getCompanies } from "@/server/actions/contacts";
import { CompaniesTable } from "@/components/companies/CompaniesTable";

export default async function CompaniesPage() {
  const companies = await getCompanies();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
          <Building2 className="h-5 w-5 text-[var(--crm-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Aziende</h1>
          <p className="text-sm text-[var(--crm-neutral-500)]">{companies.length} aziende totali</p>
        </div>
      </div>

      <CompaniesTable initialCompanies={companies} />
    </div>
  );
}
