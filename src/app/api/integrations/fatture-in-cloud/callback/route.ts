import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { featureAccess } from "@/lib/feature-access";
import { exchangeFicToken, ficRequest, ficCompanySchema } from "@/lib/fatture-in-cloud";
import { openIntegration, sealIntegration } from "@/lib/integration-crypto";
import { crmTransaction } from "@/lib/crm-transaction";
import { checkFeature } from "@/lib/plan";

const stateSchema = z.object({ state: z.string(), orgId: z.string(), userId: z.string(), expires: z.number() });
export async function GET(request: NextRequest) {
  const target = new URL("/settings/invoicing", request.url);
  try {
    const { orgId, userId } = await featureAccess("integrations", "invoicing");
    const cookie = request.cookies.get("pipely_fic_oauth")?.value;
    const state = request.nextUrl.searchParams.get("state"); const code = request.nextUrl.searchParams.get("code");
    if (!cookie || !state || !code || code.length > 4000 || request.nextUrl.searchParams.has("error")) throw new Error("OAuth rejected");
    const saved = stateSchema.parse(JSON.parse(openIntegration(cookie, "fic-oauth")));
    if (saved.orgId !== orgId || saved.userId !== userId || saved.expires < Date.now() || Buffer.byteLength(state) !== Buffer.byteLength(saved.state) || !timingSafeEqual(Buffer.from(state), Buffer.from(saved.state))) throw new Error("OAuth state mismatch");
    const tokens = await exchangeFicToken({ code });
    const result = await ficRequest<unknown>(tokens.access_token, "/user/companies");
    const companies = z.object({ data: z.object({ companies: z.array(ficCompanySchema) }) }).parse(result).data.companies;
    await featureAccess("integrations", "invoicing");
    await crmTransaction(async tx => {
      const member = await tx.user.findFirst({ where: { id: userId, organizationId: orgId, role: { in: ["OWNER", "ADMIN"] } }, include: { organization: { select: { plan: true } } } });
      if (!member || checkFeature(member.organization.plan, "invoicing")) throw new Error("OAuth permission changed");
      await tx.$queryRaw`SELECT "organizationId" FROM "InvoicingConnection" WHERE "organizationId" = ${orgId} FOR UPDATE`;
      if (await tx.invoiceExport.count({ where: { organizationId: orgId, status: { in: ["CREATING", "SENDING"] } } })) throw new Error("Invoice operation in progress");
      const old = await tx.invoicingConnection.findUnique({ where: { organizationId: orgId } });
      const retained = companies.find(company => company.id === old?.companyId);
      if (old?.companyId && !retained && await tx.invoiceExport.count({ where: { organizationId: orgId } })) throw new Error("The original invoicing company is required");
      const data = { accessToken: sealIntegration(tokens.access_token, "fic:" + orgId), refreshToken: sealIntegration(tokens.refresh_token, "fic:" + orgId), expiresAt: new Date(Date.now() + tokens.expires_in * 1000), companyId: retained?.id ?? null, companyName: retained?.name ?? null, companyVat: retained?.vat_number ?? null };
      await tx.invoicingConnection.upsert({ where: { organizationId: orgId }, create: { organizationId: orgId, ...data }, update: data });
    });
    target.searchParams.set("connection", "success");
  } catch { target.searchParams.set("connection", "error"); }
  const response = NextResponse.redirect(target);
  response.cookies.set("pipely_fic_oauth", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/integrations/fatture-in-cloud", maxAge: 0 });
  return response;
}
