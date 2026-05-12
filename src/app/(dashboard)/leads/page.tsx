import { Zap } from "lucide-react";
import { MOCK_LEADS } from "@/lib/mock-contacts";
import { LeadsTable } from "@/components/leads/LeadsTable";

export default function LeadsPage() {
  const newCount = MOCK_LEADS.filter((l) => l.status === "NEW").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
          <Zap className="h-5 w-5 text-[var(--crm-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Lead</h1>
          <p className="text-sm text-[var(--crm-neutral-500)]">
            {MOCK_LEADS.length} lead totali · {newCount} nuovi
          </p>
        </div>
      </div>

      <LeadsTable initialLeads={MOCK_LEADS} />
    </div>
  );
}
