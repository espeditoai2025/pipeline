import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Sidebar } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { AIAssistant } from "@/components/ai/AIAssistant";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex h-screen overflow-hidden bg-[var(--crm-neutral-50)] dark:bg-[#111827]">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
        <CommandPalette />
        <AIAssistant />
      </div>
    </NextIntlClientProvider>
  );
}
