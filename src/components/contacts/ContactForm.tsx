"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createContact, updateContact } from "@/server/actions/contacts";
import { getCustomFields, getCustomFieldValues, saveCustomFieldValues } from "@/server/actions/custom-fields";
import { CustomFieldsSection } from "@/components/shared/CustomFieldsSection";
import type { Contact, Company } from "@/types/contacts";
import type { CustomField } from "@/types/custom-fields";

const schema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().optional(),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  companyId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  contact?: Contact | null;
  companies: Company[];
  onSaved: (c: Contact) => void;
};

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-[var(--crm-neutral-900)] dark:text-white placeholder:text-[var(--crm-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent transition-colors";

export function ContactForm({ open, onClose, contact, companies, onSaved }: Props) {
  const isEditing = !!contact;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: contact
      ? { firstName: contact.firstName, lastName: contact.lastName ?? "", email: contact.email ?? "", phone: contact.phone ?? "", jobTitle: contact.jobTitle ?? "", companyId: contact.companyId ?? "" }
      : { firstName: "", lastName: "", email: "", phone: "", jobTitle: "", companyId: "" },
  });

  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    reset(contact
      ? { firstName: contact.firstName, lastName: contact.lastName ?? "", email: contact.email ?? "", phone: contact.phone ?? "", jobTitle: contact.jobTitle ?? "", companyId: contact.companyId ?? "" }
      : { firstName: "", lastName: "", email: "", phone: "", jobTitle: "", companyId: "" }
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomValues({});
    getCustomFields("contact").then(setCustomFields);
    if (contact?.id) {
      getCustomFieldValues(contact.id, "contact").then((vals) => {
        const map: Record<string, string> = {};
        for (const v of vals) map[v.fieldId] = v.value;
        setCustomValues(map);
      });
    }
  }, [open, contact, reset]);

  async function onSubmit(data: FormValues) {
    const result = isEditing
      ? await updateContact({ id: contact!.id, ...data })
      : await createContact(data);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    const savedId = result.data!.id;
    const cfValues = Object.entries(customValues).map(([fieldId, value]) => ({ fieldId, value }));
    if (cfValues.length > 0) {
      await saveCustomFieldValues(savedId, "contact", cfValues);
    }

    toast.success(isEditing ? "Contatto aggiornato" : "Contatto creato");
    onSaved(result.data!);
    reset();
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Modifica contatto" : "Nuovo contatto"}</SheetTitle>
        </SheetHeader>

        <SheetBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nome *</label>
              <input {...register("firstName")} className={inputCls} placeholder="Mario" />
              {errors.firstName && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cognome</label>
              <input {...register("lastName")} className={inputCls} placeholder="Rossi" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" {...register("email")} className={inputCls} placeholder="mario@esempio.it" />
            {errors.email && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Telefono</label>
            <input {...register("phone")} className={inputCls} placeholder="+39 02 1234567" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ruolo</label>
            <input {...register("jobTitle")} className={inputCls} placeholder="CTO" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Azienda</label>
            <select {...register("companyId")} className={inputCls}>
              <option value="">Nessuna azienda</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <CustomFieldsSection
            fields={customFields}
            values={customValues}
            onChange={(fieldId, value) => setCustomValues((prev) => ({ ...prev, [fieldId]: value }))}
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annulla</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Salva" : "Crea"}
            </Button>
          </div>
        </form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
