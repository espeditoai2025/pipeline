"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { CreateInvoiceModal } from "./CreateInvoiceModal";

type Props = {
  dealId: string;
  contactName?: string;
  companyName?: string;
};

export function InvoiceButton({ dealId, contactName, companyName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--crm-neutral-50)] transition-colors"
        title="Genera fattura elettronica"
      >
        <Receipt className="h-3.5 w-3.5 text-[var(--crm-primary)]" />
        Fattura
      </button>
      <CreateInvoiceModal
        dealId={dealId}
        contactName={contactName}
        companyName={companyName}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
