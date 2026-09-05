import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { DailyFocus } from "@/components/dashboard/DailyFocus";
import { MergeDuplicatesModal } from "@/components/contacts/MergeDuplicatesModal";
import { ImportCSVModal } from "@/components/contacts/ImportCSVModal";
import { ActivitiesPageClient } from "@/components/activities/ActivitiesPageClient";
import { contacts, fixture, fixtureInvoice } from "./actions";
import { InvoiceDetailClient } from "@/components/invoices/InvoiceDetailClient";
import { InvoiceWorkspace } from "@/components/invoices/InvoiceWorkspace";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import type { Activity } from "@/types/activities";
import "@/app/globals.css";

const dueDate = new Date(Date.now() - 3600000).toISOString();
const activity: Activity = {
  id: "activity-1", subject: "Richiamare Mario", type: "CALL", notes: null, dueDate, completedAt: null, duration: 30,
  dealId: "deal-1", dealTitle: "Consulenza sito web", contactId: "a", contactName: "Mario Rossi",
  userId: "test-user", user: { id: "test-user", name: "Utente Test", email: "test@example.it" }, organizationId: "test-org", createdAt: dueDate,
};
function App() {
  const [, render] = useState(0);
  const [open, setOpen] = useState(true);
  const params = new URLSearchParams(location.search);
  const view = location.pathname.startsWith("/invoices/") ? "invoice" : location.pathname === "/invoices" ? "invoices" : params.get("view");
  useEffect(() => {
    const refresh = () => render(value => value + 1);
    window.addEventListener("fixture-refresh", refresh);
    return () => window.removeEventListener("fixture-refresh", refresh);
  }, []);
  return <main className="mx-auto min-h-screen max-w-6xl bg-[var(--crm-neutral-50)] p-4 text-[var(--crm-neutral-900)] sm:p-8" style={{ fontFamily: "Arial, sans-serif" }}>
    <Toaster />
    {view === "merge" ? <><p>Unioni eseguite: {fixture.mergeCount}</p>{open && <MergeDuplicatesModal open onClose={() => setOpen(false)} duplicates={[{ key: "mario@example.it", contacts }]} onMerged={() => render(value => value + 1)} />}</>
    : view === "import" ? <ImportCSVModal open={open} onClose={() => setOpen(false)} onImported={() => render(value => value + 1)} />
    : view === "activities" ? <ActivitiesPageClient initialActivities={[activity]} gcalConnected={false} gcalConfigured={false} />
    : view === "invoice-create" ? <CreateInvoiceModal open={open} onClose={() => setOpen(false)} dealId="deal-1" companyName="Studio Rossi" />
    : view === "invoice" ? <InvoiceDetailClient invoice={{ ...fixtureInvoice }} canWrite={params.get("role") !== "viewer"} />
    : view === "invoices" ? <InvoiceWorkspace data={{ rows: [fixtureInvoice, { ...fixtureInvoice, id: "usd", number: "FT-2026/011", currency: "USD", recipientName: "Acme Consulting" }], count: 26, page: 1, pages: 2, canWrite: true, summary: [{ currency: "EUR", outstanding: 1220, received: 300, overdue: 1220, openCount: 1, overdueCount: 1 }, { currency: "USD", outstanding: 1220, received: 0, overdue: 0, openCount: 1, overdueCount: 0 }] }} />
    : <DailyFocus data={{
      generatedAt: new Date().toISOString(), overdueCount: fixture.completed ? 0 : 1, todayCount: 0, followUpCount: fixture.planned ? 0 : 1,
      activities: fixture.completed ? [] : [{ id: "activity-1", subject: activity.subject, dueDate, type: "CALL", overdue: true, deal: { id: "deal-1", title: "Consulenza sito web" }, contact: { id: "a", firstName: "Mario", lastName: "Rossi" } }],
      deals: fixture.planned ? [] : [{ id: "deal-1", title: "Consulenza sito web", value: 1200, currency: "EUR", expectedClose: null, contactId: "a", stage: { name: "Proposta inviata" } }],
    }} />}
  </main>;
}
createRoot(document.getElementById("root")!).render(<App />);
