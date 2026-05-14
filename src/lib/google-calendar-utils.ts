import type { Activity } from "@/types/activities";

export function toGoogleCalendarUrl(activity: Activity): string {
  if (!activity.dueDate) return "https://calendar.google.com";
  const start = new Date(activity.dueDate);
  const end = new Date(start.getTime() + (activity.duration ?? 30) * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: activity.subject,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: [activity.notes, activity.contactName, activity.dealTitle].filter(Boolean).join(" | "),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
