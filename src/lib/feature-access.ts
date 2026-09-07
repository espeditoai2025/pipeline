import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { crmPermissionError, type CrmPermission } from "@/lib/crm-permissions";
import { checkFeature, type FeatureKey } from "@/lib/plan";
import { CrmError } from "@/lib/crm-transaction";

export async function featureAccess(permission?: CrmPermission, feature?: FeatureKey) {
  const session = await auth();
  const userId = session?.user?.id;
  const orgId = (session?.user as { organizationId?: string } | undefined)?.organizationId;
  if (!userId || !orgId) throw new CrmError("Non autorizzato");
  const user = await db.user.findFirst({ where: { id: userId, organizationId: orgId }, select: { role: true, organization: { select: { plan: true } } } });
  if (!user) throw new CrmError("Non autorizzato");
  if (permission) {
    const error = await crmPermissionError(session, permission);
    if (error) throw new CrmError(error);
  }
  if (feature) {
    const error = checkFeature(user.organization.plan, feature);
    if (error) throw new CrmError(error);
  }
  return { orgId, userId, role: user.role, plan: user.organization.plan };
}

export function featureError(error: unknown) {
  return error instanceof CrmError ? error.message : "Operazione non riuscita. Riprova.";
}
