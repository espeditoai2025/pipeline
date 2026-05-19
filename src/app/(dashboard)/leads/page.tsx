import { Zap } from "lucide-react";
import { getLeads } from "@/server/actions/leads";
import { LeadsTable } from "@/components/leads/LeadsTable";

export const maxDuration = 60;

export default async function LeadsPage() {
  const leads = await getLeads();
  const newCount = leads.filter((l) => l.status === "NEW").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
          <Zap className="h-5 w-5 text-[var(--crm-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Lead</h1>
          <p className="text-sm text-[var(--crm-neutral-500)]">
            {leads.length} lead totali · {newCount} nuovi
          </p>
        </div>
      </div>

      <LeadsTable initialLeads={leads} />
    </div>
  );
}
