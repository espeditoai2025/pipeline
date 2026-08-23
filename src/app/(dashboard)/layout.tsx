import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Verifica Node-side della sessione: il proxy edge (src/proxy.ts) usa
  // authConfig senza accesso al DB, quindi non vede le revoche basate su
  // passwordChangedAt (cambio password, "disconnetti da tutti i dispositivi",
  // utente eliminato). Senza questo controllo un vecchio JWT continuerebbe a
  // renderizzare la dashboard, pur venendo rifiutato dalle server action.
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex h-screen overflow-hidden bg-[var(--crm-neutral-50)] dark:bg-[#111827]">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">{children}</main>
        </div>
        <MobileBottomNav />
        <CommandPalette />
        <AIAssistant />
      </div>
    </NextIntlClientProvider>
  );
}
