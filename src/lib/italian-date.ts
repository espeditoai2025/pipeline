export const CRM_TIME_ZONE = "Europe/Rome";

/** Local midnight boundaries, including Italy's 23-hour and 25-hour DST days. */
export function italianDayBounds(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: CRM_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const partsAt = (date: Date) => Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  const parts = partsAt(now);
  const midnight = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  const resolveMidnight = (target: number) => {
    let candidate = target;
    for (let i = 0; i < 3; i++) {
      const local = partsAt(new Date(candidate));
      const asUtc = Date.UTC(Number(local.year), Number(local.month) - 1, Number(local.day), Number(local.hour), Number(local.minute), Number(local.second));
      candidate += target - asUtc;
    }
    return new Date(candidate);
  };
  return { start: resolveMidnight(midnight), end: resolveMidnight(midnight + 86400_000) };
}
