import type { Activity } from "@/types/activities";

const USER = { id: "owner-1", name: "Mario Rossi", email: "mario@acme.com" };

// Dates relative to now so the calendar always has current data
function daysFromNow(n: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const MOCK_ACTIVITIES: Activity[] = [
  // Past completed
  { id: "act-1", type: "CALL", subject: "Chiamata di scoperta con Acme", notes: "Ha mostrato interesse per il modulo reportistica", dueDate: daysFromNow(-5, 11), completedAt: daysFromNow(-5, 11), duration: 30, organizationId: "org-1", userId: "owner-1", user: USER, dealId: "deal-1", dealTitle: "CRM Enterprise Acme", contactId: "cnt-1", contactName: "Luca Bianchi", createdAt: daysFromNow(-6) },
  { id: "act-2", type: "EMAIL", subject: "Invio proposta commerciale", notes: null, dueDate: daysFromNow(-3, 9), completedAt: daysFromNow(-3, 9), duration: null, organizationId: "org-1", userId: "owner-1", user: USER, dealId: "deal-2", dealTitle: "Consulenza Beta Q3", contactId: "cnt-3", contactName: "Marco Ricci", createdAt: daysFromNow(-4) },
  { id: "act-3", type: "MEETING", subject: "Demo prodotto con Gamma Industrie", notes: "Partecipanti: Roberto Esposito + team IT (3 persone)", dueDate: daysFromNow(-1, 14), completedAt: daysFromNow(-1, 15), duration: 60, organizationId: "org-1", userId: "owner-1", user: USER, dealId: "deal-3", dealTitle: "Fornitura ERP Gamma", contactId: "cnt-5", contactName: "Roberto Esposito", createdAt: daysFromNow(-2) },

  // Today
  { id: "act-4", type: "CALL", subject: "Follow-up proposta Delta Finance", notes: null, dueDate: daysFromNow(0, 10), completedAt: null, duration: 15, organizationId: "org-1", userId: "owner-1", user: USER, dealId: "deal-4", dealTitle: "Soluzione Finance Delta", contactId: "cnt-6", contactName: "Anna Mancini", createdAt: daysFromNow(-1) },
  { id: "act-5", type: "TASK", subject: "Preparare documentazione tecnica", notes: "Da allegare all'offerta per Epsilon", dueDate: daysFromNow(0, 17), completedAt: null, duration: null, organizationId: "org-1", userId: "owner-1", user: USER, dealId: "deal-5", dealTitle: "Progetto Media Epsilon", contactId: "cnt-8", contactName: "Chiara Romano", createdAt: daysFromNow(-1) },

  // Tomorrow
  { id: "act-6", type: "MEETING", subject: "Pranzo con CTO di Acme", notes: "Ristorante Il Portico, ore 13:00", dueDate: daysFromNow(1, 13), completedAt: null, duration: 90, organizationId: "org-1", userId: "owner-1", user: USER, dealId: "deal-1", dealTitle: "CRM Enterprise Acme", contactId: "cnt-1", contactName: "Luca Bianchi", createdAt: daysFromNow(0) },
  { id: "act-7", type: "CALL", subject: "Chiamata introduttiva nuovo lead", notes: null, dueDate: daysFromNow(1, 15), completedAt: null, duration: 20, organizationId: "org-1", userId: "owner-1", user: USER, dealId: null, dealTitle: null, contactId: "cnt-9", contactName: "Davide Bruno", createdAt: daysFromNow(0) },

  // This week
  { id: "act-8", type: "DEADLINE", subject: "Scadenza offerta Gamma — accettazione entro fine settimana", notes: null, dueDate: daysFromNow(3, 18), completedAt: null, duration: null, organizationId: "org-1", userId: "owner-1", user: USER, dealId: "deal-3", dealTitle: "Fornitura ERP Gamma", contactId: "cnt-5", contactName: "Roberto Esposito", createdAt: daysFromNow(-3) },
  { id: "act-9", type: "MEETING", subject: "Workshop onboarding cliente", notes: "2h — portare laptop con demo ambiente", dueDate: daysFromNow(4, 9), completedAt: null, duration: 120, organizationId: "org-1", userId: "owner-1", user: USER, dealId: "deal-2", dealTitle: "Consulenza Beta Q3", contactId: "cnt-3", contactName: "Marco Ricci", createdAt: daysFromNow(-1) },
  { id: "act-10", type: "EMAIL", subject: "Newsletter mensile clienti attivi", notes: null, dueDate: daysFromNow(5, 11), completedAt: null, duration: null, organizationId: "org-1", userId: "owner-1", user: USER, dealId: null, dealTitle: null, contactId: null, contactName: null, createdAt: daysFromNow(0) },

  // Next week
  { id: "act-11", type: "LUNCH", subject: "Business lunch con referral Giovanni Scala", notes: "Potenziale affare da 80k€", dueDate: daysFromNow(8, 13), completedAt: null, duration: 90, organizationId: "org-1", userId: "owner-1", user: USER, dealId: null, dealTitle: null, contactId: null, contactName: null, createdAt: daysFromNow(0) },
  { id: "act-12", type: "TASK", subject: "Aggiornare forecast Q3 nel CRM", notes: null, dueDate: daysFromNow(9, 16), completedAt: null, duration: null, organizationId: "org-1", userId: "owner-1", user: USER, dealId: null, dealTitle: null, contactId: null, contactName: null, createdAt: daysFromNow(0) },
];
