"use client";

import { useState } from "react";
import { ArrowRightCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { convertLead } from "@/server/actions/leads";
import type { Lead } from "@/types/contacts";

type Props = {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onConverted: (leadId: string, dealId: string) => void;
};

export function ConvertLeadModal({ open, onClose, lead, onConverted }: Props) {
  const [dealTitle, setDealTitle] = useState(lead?.title ?? "");
  const [loading, setLoading] = useState(false);

  if (!lead) return null;

  async function handleConvert() {
    if (!lead) return;
    setLoading(true);
    const res = await convertLead(lead.id, dealTitle || lead.title);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Lead convertito in affare");
      onConverted(lead.id, res.dealId!);
      onClose();
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Converti lead in affare</SheetTitle>
        </SheetHeader>

        <SheetBody>
        <div className="space-y-5">
          <div className="rounded-xl border border-[var(--crm-neutral-100)] p-4 bg-[var(--crm-neutral-50)] dark:bg-white/5">
            <p className="text-sm font-medium">{lead.title}</p>
            {lead.source && <p className="text-xs text-[var(--crm-neutral-500)] mt-1">Sorgente: {lead.source}</p>}
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-[var(--crm-neutral-200)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--crm-primary)]" style={{ width: `${lead.score}%` }} />
              </div>
              <span className="text-xs font-semibold text-[var(--crm-primary)]">{lead.score}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Titolo dell&apos;affare</label>
            <input
              value={dealTitle}
              onChange={(e) => setDealTitle(e.target.value)}
              className="w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
              placeholder={lead.title}
            />
          </div>

          <div className="rounded-lg border border-[var(--crm-neutral-100)] p-3 text-xs text-[var(--crm-neutral-500)] space-y-1">
            <p className="font-medium text-[var(--crm-neutral-700)]">Operazioni eseguite:</p>
            <p>• Crea un nuovo affare nel primo stage della pipeline predefinita</p>
            <p>• Segna il lead come &quot;Convertito&quot;</p>
            <p>• Collega il lead all&apos;affare creato</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annulla</Button>
            <Button
              type="button"
              disabled={loading}
              className="flex-1 bg-[var(--crm-success)] hover:bg-[var(--crm-success)]/90 text-white"
              onClick={handleConvert}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightCircle className="h-4 w-4 mr-2" />}
              Converti
            </Button>
          </div>
        </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
