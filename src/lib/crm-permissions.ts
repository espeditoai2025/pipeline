import type { Session } from "next-auth";
import { db } from "@/lib/db";

export type CrmPermission = "write" | "manage" | "integrations";
const ROLES: Record<CrmPermission, readonly string[]> = {
  write: ["OWNER", "ADMIN", "MANAGER", "SALES"],
  manage: ["OWNER", "ADMIN", "MANAGER"],
  integrations: ["OWNER", "ADMIN"],
};

/** Re-read membership: a session or an old API key must not preserve revoked rights. */
export async function crmPermissionError(
  session: Session | null,
  permission: CrmPermission = "write",
): Promise<string | null> {
  const user = session?.user as { id?: string; organizationId?: string } | undefined;
  if (!user?.id || !user.organizationId) return "Non autorizzato";
  const current = await db.user.findUnique({
    where: { id: user.id },
    select: { role: true, organizationId: true },
  });
  if (
    !current ||
    current.organizationId !== user.organizationId ||
    !ROLES[permission].includes(current.role)
  ) {
    return "Permesso negato per questa operazione";
  }
  return null;
}
