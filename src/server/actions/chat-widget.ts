"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Session } from "next-auth";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

export type ChatMessageItem = {
  id: string;
  visitorName: string;
  visitorEmail: string;
  message: string;
  page: string | null;
  isRead: boolean;
  createdAt: Date;
};

export async function getChatMessages(): Promise<ChatMessageItem[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  return db.chatMessage.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function markChatMessageRead(id: string): Promise<void> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return;

  await db.chatMessage.updateMany({
    where: { id, organizationId: orgId },
    data: { isRead: true },
  });
}

export async function deleteChatMessage(id: string): Promise<void> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return;

  await db.chatMessage.deleteMany({ where: { id, organizationId: orgId } });
}

export async function getUnreadCount(): Promise<number> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return 0;

  return db.chatMessage.count({ where: { organizationId: orgId, isRead: false } });
}

export async function getWidgetSnippet(): Promise<string> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return "";
  return orgId;
}
