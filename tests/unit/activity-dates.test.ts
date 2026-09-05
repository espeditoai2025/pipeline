import { afterEach, describe, expect, it, vi } from "vitest";
import { activityBucket, fromLocalDateTimeInput, toLocalDateTimeInput } from "@/lib/activity-dates";
import { italianDayBounds } from "@/lib/italian-date";

afterEach(() => vi.unstubAllEnvs());

describe("scadenze e orari", () => {
  it("assegna una sola categoria anche a scadenze di oggi già passate e attività senza data", () => {
    const now = new Date(2026, 8, 5, 12);
    const activity = (dueDate: Date | null, completedAt: string | null = null) => ({ dueDate: dueDate?.toISOString() ?? null, completedAt });
    expect(activityBucket(activity(new Date(2026, 8, 5, 10)), now)).toBe("overdue");
    expect(activityBucket(activity(new Date(2026, 8, 5, 14)), now)).toBe("today");
    expect(activityBucket(activity(new Date(2026, 8, 6, 9)), now)).toBe("tomorrow");
    expect(activityBucket(activity(new Date(2026, 8, 9, 9)), now)).toBe("week");
    expect(activityBucket(activity(new Date(2026, 8, 20, 9)), now)).toBe("later");
    expect(activityBucket(activity(null), now)).toBe("undated");
    expect(activityBucket(activity(new Date(2026, 8, 1), now.toISOString()), now)).toBe("done");
  });
  it.each([
    ["2026-07-15T08:30:00.000Z", "2026-07-15T10:30"],
    ["2026-01-15T08:30:00.000Z", "2026-01-15T09:30"],
  ])("non sposta appuntamenti italiani nel percorso modifica/salva: %s", (iso, local) => {
    vi.stubEnv("TZ", "Europe/Rome");
    expect(toLocalDateTimeInput(iso)).toBe(local);
    expect(fromLocalDateTimeInput(local)).toBe(iso);
  });
  it("consente di rimuovere una data", () => {
    expect(fromLocalDateTimeInput("")).toBe("");
    expect(toLocalDateTimeInput("non-data")).toBe("");
  });
  it.each([
    ["2026-03-29T12:00:00Z", "2026-03-28T23:00:00.000Z", "2026-03-29T22:00:00.000Z", 23],
    ["2026-10-25T12:00:00Z", "2026-10-24T22:00:00.000Z", "2026-10-25T23:00:00.000Z", 25],
    ["2026-09-05T23:30:00Z", "2026-09-05T22:00:00.000Z", "2026-09-06T22:00:00.000Z", 24],
  ])("calcola la giornata italiana indipendentemente dal server: %s", (iso, start, end, hours) => {
    vi.stubEnv("TZ", "UTC");
    const bounds = italianDayBounds(new Date(iso));
    expect(bounds.start.toISOString()).toBe(start);
    expect(bounds.end.toISOString()).toBe(end);
    expect((bounds.end.getTime() - bounds.start.getTime()) / 3600000).toBe(hours);
  });
});
