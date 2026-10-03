import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { McpSettings } from "@/components/settings/McpSettings";
import { fixtureMcpSettings } from "./actions";
import "@/app/globals.css";
createRoot(document.getElementById("root")!).render(
  <main
    className="min-h-screen bg-[var(--crm-neutral-50)] p-4 text-[var(--crm-neutral-900)] sm:p-8"
    style={{ fontFamily: "Arial, sans-serif" }}
  >
    <Toaster />
    <McpSettings initial={fixtureMcpSettings} />
  </main>,
);
