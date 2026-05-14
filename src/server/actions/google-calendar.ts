"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Activity } from "@/types/activities";

async function getValidToken(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      googleCalendarToken: true,
      googleCalendarRefreshToken: true,
      googleCalendarTokenExpiry: true,
    },
  });
  if (!user?.googleCalendarToken) return null;

  const isExpired = user.googleCalendarTokenExpiry
    ? new Date(user.googleCalendarTokenExpiry) < new Date(Date.now() + 60_000)
    : false;

  if (!isExpired) return user.googleCalendarToken;

  if (!user.googleCalendarRefreshToken) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: user.googleCalendarRefreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json() as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;

    const expiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
    await db.user.update({
      where: { id: userId },
      data: { googleCalendarToken: data.access_token, googleCalendarTokenExpiry: expiry },
    });
    return data.access_token;
  } catch {
    return null;
  }
}

export async function getGoogleCalendarStatus(): Promise<{ connected: boolean; configured: boolean }> {
  const configured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (!configured) return { connected: false, configured: false };

  const session = await auth();
  if (!session?.user?.id) return { connected: false, configured };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { googleCalendarToken: true },
  });
  return { connected: !!user?.googleCalendarToken, configured };
}

export async function syncActivityToGoogleCalendar(activity: Activity): Promise<{ error: string | null; eventId?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorizzato" };

  const token = await getValidToken(session.user.id);
  if (!token) return { error: "Google Calendar non connesso" };

  if (!activity.dueDate) return { error: "L'attività non ha una data" };

  const start = new Date(activity.dueDate);
  const end = new Date(start.getTime() + (activity.duration ?? 30) * 60_000);

  const event = {
    summary: activity.subject,
    description: [
      activity.notes,
      activity.contactName ? `Contatto: ${activity.contactName}` : null,
      activity.dealTitle ? `Affare: ${activity.dealTitle}` : null,
    ].filter(Boolean).join("\n"),
    start: { dateTime: start.toISOString(), timeZone: "Europe/Rome" },
    end: { dateTime: end.toISOString(), timeZone: "Europe/Rome" },
    source: { title: "Pipely CRM", url: `${process.env.NEXTAUTH_URL ?? ""}/activities` },
  };

  try {
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });
    const data = await res.json() as { id?: string; error?: { message: string } };
    if (data.error) return { error: data.error.message };
    return { error: null, eventId: data.id };
  } catch {
    return { error: "Errore di connessione a Google Calendar" };
  }
}

