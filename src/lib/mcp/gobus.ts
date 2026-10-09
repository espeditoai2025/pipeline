import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { CrmError } from "@/lib/crm-transaction";
import type { McpContext } from "./auth";
import { write } from "./crm";
import { assertRefs, assertVersion, jsonRecord, lockOrg, nextVersion, omit } from "./operations";
import type { z } from "zod";
import type * as s from "./schemas";

export async function getMcpGobusProfile(
  c: McpContext,
  input: z.infer<typeof s.gobusProfileReadSchema>,
) {
  const company = await db.company.findFirst({
    where: { id: input.companyId, organizationId: c.organizationId },
    select: {
      id: true,
      email: true,
      operationalEmail: true,
      referentEmail: true,
      contacts: {
        where: { organizationId: c.organizationId },
        select: { email: true, operationalEmail: true },
        take: 100,
      },
    },
  });
  if (!company) throw new CrmError("Azienda non disponibile");
  const addresses = [
    ...new Set(
      [
        company.email,
        company.operationalEmail,
        company.referentEmail,
        ...company.contacts.flatMap((x) => [x.email, x.operationalEmail]),
      ]
        .filter((x): x is string => !!x)
        .map((x) => x.trim().toLowerCase()),
    ),
  ];
  return {
    profile: await db.gobusProfile.findFirst({
      where: { companyId: company.id, organizationId: c.organizationId },
    }),
    recipientPolicies: await db.recipientPolicy.findMany({
      where: { organizationId: c.organizationId, address: { in: addresses } },
      select: {
        address: true,
        status: true,
        reason: true,
        source: true,
        effectiveAt: true,
        suspendedUntil: true,
        updatedAt: true,
      },
    }),
    instructions:
      "Il canone è separato dal valore delle offerte. Un canone verificato non è un incasso riconciliato; upgrade in prova e offerte non modificano il canone base.",
  };
}
export async function setMcpGobusProfile(
  c: McpContext,
  input: z.infer<typeof s.gobusProfileWriteSchema>,
) {
  return write(
    c,
    "pipely_set_gobus_profile",
    input,
    async (tx) => {
      await lockOrg(tx, c.organizationId);
      await assertRefs(tx, c.organizationId, input);
      const before = await tx.gobusProfile.findFirst({
        where: { companyId: input.companyId, organizationId: c.organizationId },
      });
      if (before) assertVersion(before, input.expectedUpdatedAt);
      else if (input.expectedUpdatedAt) throw new CrmError("Il profilo non esiste ancora");
      const fields = omit(input, "requestId", "expectedUpdatedAt");
      const data = {
        ...fields,
        ...(input.trialEndsAt !== undefined && {
          trialEndsAt: input.trialEndsAt ? new Date(input.trialEndsAt) : null,
        }),
        ...(input.activatedAt !== undefined && {
          activatedAt: input.activatedAt ? new Date(input.activatedAt) : null,
        }),
        ...(input.firstServiceAt !== undefined && {
          firstServiceAt: input.firstServiceAt ? new Date(input.firstServiceAt) : null,
        }),
        ...(input.feeVerifiedAt !== undefined && {
          feeVerifiedAt: input.feeVerifiedAt ? new Date(input.feeVerifiedAt) : null,
        }),
      };
      const amountChanged =
        input.feeAmount !== undefined && Number(input.feeAmount) !== Number(before?.feeAmount);
      const economicsChanged =
        amountChanged ||
        ["feeCurrency", "feePeriod", "feeVat", "feeSource"].some(
          (k) =>
            fields[k as keyof typeof fields] !== undefined &&
            fields[k as keyof typeof fields] !== before?.[k as keyof typeof before],
        );
      // Changing an economic fact invalidates old verification unless new evidence accompanies it.
      if (economicsChanged && input.feeVerifiedAt === undefined) {
        data.feeVerifiedAt = null;
        data.feeEvidence = null;
      }
      if (economicsChanged && input.feeVerifiedAt && !input.feeEvidence)
        throw new CrmError("La modifica del canone richiede una nuova evidenza di verifica");
      const verifiedAt =
        data.feeVerifiedAt === undefined ? before?.feeVerifiedAt : data.feeVerifiedAt;
      const evidence = data.feeEvidence === undefined ? before?.feeEvidence : data.feeEvidence;
      const feeSource = data.feeSource === undefined ? before?.feeSource : data.feeSource;
      if (verifiedAt && (!evidence || !feeSource || verifiedAt > new Date()))
        throw new CrmError("La verifica del canone richiede fonte, evidenza e data non futura");
      const amount = input.feeAmount === undefined ? before?.feeAmount : input.feeAmount;
      const period = input.feePeriod === undefined ? before?.feePeriod : input.feePeriod;
      if (amount != null && !period) throw new CrmError("Specifica la periodicità del canone");
      const row = before
        ? await tx.gobusProfile.update({
            where: { id: before.id },
            data: { ...data, updatedAt: nextVersion(before) },
          })
        : await tx.gobusProfile.create({ data: { ...data, organizationId: c.organizationId } });
      return {
        entityType: "gobusProfile",
        id: row.id,
        updatedAt: row.updatedAt.toISOString(),
        record: jsonRecord(row),
      };
    },
    { wakeEffects: false },
  );
}
export async function getMcpGobusReport(c: McpContext, input: z.infer<typeof s.gobusReportSchema>) {
  const profiles = await db.gobusProfile.findMany({
    where: {
      organizationId: c.organizationId,
      isTest: false,
      company: { organizationId: c.organizationId },
      ...(input.source && { source: input.source }),
      ...(input.segment && { segment: input.segment }),
    },
  });
  const totals = new Map<
    string,
    { currency: string; period: string; vat: string; amount: Prisma.Decimal; companies: number }
  >();
  const paying = profiles.filter(
    (p) =>
      p.lifecycle === "CUSTOMER" &&
      p.verificationStatus === "VERIFIED" &&
      p.feeVerifiedAt &&
      p.feeVerifiedAt <= new Date() &&
      p.feeEvidence &&
      p.feeSource &&
      p.feeAmount &&
      Number(p.feeAmount) > 0 &&
      p.feePeriod &&
      p.feePeriod !== "ONE_OFF",
  );
  for (const p of paying) {
    const key = `${p.feeCurrency}:${p.feePeriod}:${p.feeVat}`;
    const t = totals.get(key) ?? {
      currency: p.feeCurrency,
      period: p.feePeriod!,
      vat: p.feeVat,
      amount: new Prisma.Decimal(0),
      companies: 0,
    };
    t.amount = t.amount.plus(p.feeAmount!);
    t.companies++;
    totals.set(key, t);
  }
  const acceptedOffers = await db.deal.groupBy({
    by: ["currency"],
    where: {
      organizationId: c.organizationId,
      isTest: false,
      status: "WON",
      acceptanceEvidence: { not: null },
      companyId: { in: profiles.map((p) => p.companyId) },
    },
    _sum: { value: true },
    _count: { _all: true },
  });
  return {
    totalCompanies: profiles.length,
    payingCompanies: paying.length,
    trials: profiles.filter((p) => p.lifecycle === "TRIAL").length,
    verifiedContractedRecurring: [...totals.values()].map((t) => ({
      ...t,
      amount: Number(t.amount),
    })),
    acceptedOffers: {
      count: acceptedOffers.reduce((count, row) => count + row._count._all, 0),
      byCurrency: acceptedOffers.map((row) => ({
        currency: row.currency,
        value: Number(row._sum.value ?? 0),
        count: row._count._all,
      })),
    },
    reconciledReceipts: null,
    instructions:
      "Canoni contrattuali verificati, non incassi. Valute, periodicità e IVA restano separate. Esclusi test, prove gratuite, prospect, canoni non verificati e offerte dal ricorrente. Un upgrade in prova non modifica il piano base. Incassi riconciliati non disponibili in questo report.",
  };
}
