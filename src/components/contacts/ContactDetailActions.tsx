"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/contacts/ContactForm";
import type { Company } from "@/types/contacts";

type ContactData = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  organizationId: string;
  ownerId: string;
  owner: { id: string; name: string | null; email: string };
  companyId: string | null;
  company: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  contact: ContactData;
  companies: Company[];
};

export function ContactDetailActions({ contact, companies }: Props) {
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
      <ContactForm
        open={open}
        onClose={() => setOpen(false)}
        contact={contact as import("@/types/contacts").Contact}
        companies={companies}
        onSaved={() => { setOpen(false); window.location.reload(); }}
      />
    </>
  );
}
