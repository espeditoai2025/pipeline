"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Session } from "next-auth";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}
function getUserId(s: Session | null) {
  return (s?.user as { id?: string } | undefined)?.id ?? null;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type BookingPageItem = {
  id: string;
  slug: string;
  title: string;
  duration: number;
  isActive: boolean;
  bookingsCount: number;
  createdAt: Date;
};

export type BookingPageDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration: number;
  availability: Record<string, string[]>;
  bufferBefore: number;
  bufferAfter: number;
  maxDaysAhead: number;
  isActive: boolean;
  userName: string;
};

export type BookingItem = {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  notes: string | null;
  startTime: Date;
  endTime: Date;
  status: string;
  bookingPageTitle: string;
};

export type TimeSlot = {
  start: string; // ISO string
  end: string;
};

// ── CRUD Booking Pages ───────────────────────────────────────────────────────

const DEFAULT_AVAILABILITY: Record<string, string[]> = {
  mon: ["09:00-13:00", "14:00-18:00"],
  tue: ["09:00-13:00", "14:00-18:00"],
  wed: ["09:00-13:00", "14:00-18:00"],
  thu: ["09:00-13:00", "14:00-18:00"],
  fri: ["09:00-13:00", "14:00-18:00"],
  sat: [],
  sun: [],
};

export async function getBookingPages(): Promise<BookingPageItem[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const pages = await db.bookingPage.findMany({
    where: { organizationId: orgId },
    include: { _count: { select: { bookings: true } } },
    orderBy: { createdAt: "desc" },
  });

  return pages.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    duration: p.duration,
    isActive: p.isActive,
    bookingsCount: p._count.bookings,
    createdAt: p.createdAt,
  }));
}

export async function createBookingPage(data: {
  title: string;
  slug: string;
  description?: string;
  duration?: number;
}): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  const orgId = getOrgId(session);
  const userId = getUserId(session);
  if (!orgId || !userId) return { success: false, error: "Non autenticato" };

  const slug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const exists = await db.bookingPage.findUnique({ where: { slug } });
  if (exists) return { success: false, error: "Slug già in uso" };

  await db.bookingPage.create({
    data: {
      title: data.title,
      slug,
      description: data.description ?? null,
      duration: data.duration ?? 30,
      availability: DEFAULT_AVAILABILITY,
      organizationId: orgId,
      userId,
    },
  });

  return { success: true };
}

export async function updateBookingPage(
  id: string,
  data: {
    title?: string;
    description?: string;
    duration?: number;
    availability?: Record<string, string[]>;
    bufferBefore?: number;
    bufferAfter?: number;
    maxDaysAhead?: number;
    isActive?: boolean;
  },
): Promise<{ success: boolean }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { success: false };

  await db.bookingPage.updateMany({
    where: { id, organizationId: orgId },
    data: data as Parameters<typeof db.bookingPage.updateMany>[0]["data"],
  });

  return { success: true };
}

export async function deleteBookingPage(id: string): Promise<{ success: boolean }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { success: false };

  await db.bookingPage.deleteMany({ where: { id, organizationId: orgId } });
  return { success: true };
}

// ── Public: get page info + available slots ──────────────────────────────────

export async function getPublicBookingPage(slug: string): Promise<BookingPageDetail | null> {
  const page = await db.bookingPage.findUnique({
    where: { slug },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!page || !page.isActive) return null;

  return {
    id: page.id,
    slug: page.slug,
    title: page.title,
    description: page.description,
    duration: page.duration,
    availability: page.availability as Record<string, string[]>,
    bufferBefore: page.bufferBefore,
    bufferAfter: page.bufferAfter,
    maxDaysAhead: page.maxDaysAhead,
    isActive: page.isActive,
    userName: page.user.name ?? page.user.email.split("@")[0]!,
  };
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export async function getAvailableSlots(
  slug: string,
  dateStr: string, // YYYY-MM-DD
): Promise<TimeSlot[]> {
  const page = await db.bookingPage.findUnique({ where: { slug } });
  if (!page || !page.isActive) return [];

  const avail = page.availability as Record<string, string[]>;
  const date = new Date(dateStr + "T00:00:00");
  const dayKey = DAY_KEYS[date.getDay()]!;
  const ranges = avail[dayKey] ?? [];

  if (ranges.length === 0) return [];

  // Check max days ahead
  const now = new Date();
  const maxDate = new Date(now.getTime() + page.maxDaysAhead * 86400_000);
  if (date > maxDate) return [];
  if (date < new Date(now.toISOString().slice(0, 10) + "T00:00:00")) return [];

  // Get existing bookings for this date
  const dayStart = new Date(dateStr + "T00:00:00Z");
  const dayEnd = new Date(dateStr + "T23:59:59Z");
  const existingBookings = await db.booking.findMany({
    where: {
      bookingPageId: page.id,
      status: "CONFIRMED",
      startTime: { gte: dayStart, lte: dayEnd },
    },
    select: { startTime: true, endTime: true },
  });

  const slots: TimeSlot[] = [];
  const duration = page.duration;
  const bufferBefore = page.bufferBefore;
  const bufferAfter = page.bufferAfter;

  for (const range of ranges) {
    const [startStr, endStr] = range.split("-");
    if (!startStr || !endStr) continue;

    const [sh, sm] = startStr.split(":").map(Number);
    const [eh, em] = endStr.split(":").map(Number);

    let cursor = new Date(dateStr + "T00:00:00");
    cursor.setHours(sh!, sm!, 0, 0);

    const rangeEnd = new Date(dateStr + "T00:00:00");
    rangeEnd.setHours(eh!, em!, 0, 0);

    while (cursor.getTime() + duration * 60_000 <= rangeEnd.getTime()) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + duration * 60_000);

      // Check buffer zone conflicts
      const bufferedStart = new Date(slotStart.getTime() - bufferBefore * 60_000);
      const bufferedEnd = new Date(slotEnd.getTime() + bufferAfter * 60_000);

      const conflict = existingBookings.some(
        (b) => new Date(b.startTime) < bufferedEnd && new Date(b.endTime) > bufferedStart,
      );

      // Skip past slots for today
      const isPast = slotStart <= now;

      if (!conflict && !isPast) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
        });
      }

      cursor = new Date(cursor.getTime() + 30 * 60_000); // 30min intervals
    }
  }

  return slots;
}

// ── Public: create booking ───────────────────────────────────────────────────

export async function createBooking(data: {
  slug: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  notes?: string;
  startTime: string;
}): Promise<{ success: boolean; error?: string }> {
  const page = await db.bookingPage.findUnique({ where: { slug: data.slug } });
  if (!page || !page.isActive) return { success: false, error: "Pagina non trovata" };

  const start = new Date(data.startTime);
  const end = new Date(start.getTime() + page.duration * 60_000);

  // Check no double-booking
  const conflict = await db.booking.findFirst({
    where: {
      bookingPageId: page.id,
      status: "CONFIRMED",
      startTime: { lt: end },
      endTime: { gt: start },
    },
  });

  if (conflict) return { success: false, error: "Slot non più disponibile" };

  await db.booking.create({
    data: {
      bookingPageId: page.id,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone ?? null,
      notes: data.notes ?? null,
      startTime: start,
      endTime: end,
    },
  });

  return { success: true };
}

// ── Dashboard: list bookings ─────────────────────────────────────────────────

export async function getUpcomingBookings(): Promise<BookingItem[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const bookings = await db.booking.findMany({
    where: {
      bookingPage: { organizationId: orgId },
      status: "CONFIRMED",
      startTime: { gte: new Date() },
    },
    include: { bookingPage: { select: { title: true } } },
    orderBy: { startTime: "asc" },
    take: 50,
  });

  return bookings.map((b) => ({
    id: b.id,
    guestName: b.guestName,
    guestEmail: b.guestEmail,
    guestPhone: b.guestPhone,
    notes: b.notes,
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status,
    bookingPageTitle: b.bookingPage.title,
  }));
}

export async function cancelBooking(id: string): Promise<{ success: boolean }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { success: false };

  await db.booking.updateMany({
    where: { id, bookingPage: { organizationId: orgId } },
    data: { status: "CANCELLED" },
  });

  return { success: true };
}
