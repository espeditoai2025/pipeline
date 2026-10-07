import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;

export const FROM_DEFAULT = process.env.RESEND_FROM?.trim() || "Pipely CRM <info@pipely.it>";

export function isEmailEnabled(): boolean {
  return !!apiKey;
}
