export type CustomBillingType = { id: string; name: string; period?: string };

export const PREDEFINED_BILLING_TYPES: {
  id: string;
  name: string;
  description: string;
  isRecurring: boolean;
}[] = [
  { id: "one_time",       name: "Una tantum",        description: "Pagamento unico",         isRecurring: false },
  { id: "monthly",        name: "Mensile",           description: "Abbonamento mensile",     isRecurring: true  },
  { id: "annual",         name: "Annuale",           description: "Abbonamento annuale",     isRecurring: true  },
  { id: "rental_monthly", name: "Noleggio mensile",  description: "Canone noleggio mensile", isRecurring: true  },
  { id: "rental_annual",  name: "Noleggio annuale",  description: "Canone noleggio annuale", isRecurring: true  },
  { id: "lease_monthly",  name: "Affitto mensile",   description: "Canone affitto mensile",  isRecurring: true  },
  { id: "lease_annual",   name: "Affitto annuale",   description: "Canone affitto annuale",  isRecurring: true  },
];
