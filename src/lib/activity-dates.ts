type DatedActivity = { dueDate: string | null; completedAt: string | null };
export type ActivityBucket = "overdue" | "today" | "tomorrow" | "week" | "later" | "undated" | "done";

/** Each activity belongs to exactly one section. Dates use the user's local timezone. */
export function activityBucket(activity: DatedActivity, now = new Date()): ActivityBucket {
  if (activity.completedAt) return "done";
  if (!activity.dueDate) return "undated";
  const due = new Date(activity.dueDate);
  if (!Number.isFinite(due.getTime())) return "undated";
  if (due < now) return "overdue";
  const day = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (day(due) === day(now)) return "today";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (day(due) === day(tomorrow)) return "tomorrow";
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  return due <= nextWeek ? "week" : "later";
}

/** datetime-local expects local wall time, not a truncated UTC ISO timestamp. */
export function toLocalDateTimeInput(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalDateTimeInput(value: string): string {
  if (!value) return "";
  return new Date(value).toISOString();
}
