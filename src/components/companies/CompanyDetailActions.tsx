"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyForm } from "@/components/companies/CompanyForm";
import type { Company } from "@/types/contacts";

type Props = {
  company: Company;
};

export function CompanyDetailActions({ company }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs"
      >
        <Pencil className="h-3.5 w-3.5" /> Modifica
      </Button>
      <CompanyForm
        open={open}
        onClose={() => setOpen(false)}
        company={company}
        onSaved={() => { setOpen(false); window.location.reload(); }}
      />
    </>
  );
}
