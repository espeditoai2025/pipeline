"use client";

import { useState } from "react";
import { ArrowRightCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConvertLeadModal } from "./ConvertLeadModal";
import type { Lead } from "@/types/contacts";

export function LeadDetailClient({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [convertOpen, setConvertOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        onClick={() => setConvertOpen(true)}
        className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white gap-1.5"
      >
        <ArrowRightCircle className="h-4 w-4" /> Converti in affare
      </Button>
      <ConvertLeadModal
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        lead={lead}
        onConverted={(_, dealId) => router.push(`/deals/${dealId}`)}
      />
    </>
  );
}
