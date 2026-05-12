import { Eye, MousePointerClick, Send, FileEdit } from "lucide-react";
import type { TrackingStatus, EmailStatus } from "@/types/emails";

type Props = {
  tracking: TrackingStatus;
  status: EmailStatus;
};

export function TrackingBadge({ tracking, status }: Props) {
  if (status === "DRAFT") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-600)]">
        <FileEdit className="h-3 w-3" /> Bozza
      </span>
    );
  }
  if (status === "RECEIVED") return null;

  const configs: Record<TrackingStatus, { label: string; className: string; Icon: React.ElementType } | null> = {
    NONE: null,
    SENT: { label: "Inviata", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", Icon: Send },
    OPENED: { label: "Aperta", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", Icon: Eye },
    CLICKED: { label: "Link cliccato", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", Icon: MousePointerClick },
  };

  const cfg = configs[tracking];
  if (!cfg) return null;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      <cfg.Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}
