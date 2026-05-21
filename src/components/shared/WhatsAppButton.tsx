"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function cleanPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-().]/g, "");
  // Italian numbers: add +39 if no country code
  if (cleaned.startsWith("0") || (cleaned.length === 10 && /^3\d{9}$/.test(cleaned))) {
    cleaned = "39" + cleaned.replace(/^0/, "");
  }
  cleaned = cleaned.replace(/^\+/, "");
  return cleaned;
}

type Props = {
  phone: string;
  contactName?: string;
  dealTitle?: string;
  /** "icon" = small icon button, "full" = text + icon */
  variant?: "icon" | "full";
  className?: string;
};

export function WhatsAppButton({ phone, contactName, dealTitle, variant = "full", className }: Props) {
  const cleanedPhone = cleanPhone(phone);

  let message = "";
  if (contactName && dealTitle) {
    message = `Ciao ${contactName}, ti scrivo riguardo a "${dealTitle}".`;
  } else if (contactName) {
    message = `Ciao ${contactName}, ti scrivo da Pipely CRM.`;
  }

  const url = message
    ? `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${cleanedPhone}`;

  if (variant === "icon") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center justify-center rounded-lg p-1.5 text-[#25D366] hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors",
          className,
        )}
        title={`WhatsApp ${contactName ?? phone}`}
      >
        <MessageCircle className="h-4 w-4" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-[#25D366]/30 bg-[#25D366]/5 px-3 py-2 text-sm font-medium text-[#25D366] hover:bg-[#25D366]/10 transition-colors",
        className,
      )}
    >
      <MessageCircle className="h-4 w-4" /> WhatsApp
    </a>
  );
}
