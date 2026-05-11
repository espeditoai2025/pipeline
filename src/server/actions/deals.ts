"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";

const moveSchema = z.object({
  dealId: z.string(),
  newStageId: z.string(),
  oldStageId: z.string(),
});

export async function moveDeal(input: z.infer<typeof moveSchema>) {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { error: "Input non valido" };

  const { dealId, newStageId } = parsed.data;

  try {
    // TODO: replace with real DB update after migration
    // await db.deal.update({
    //   where: { id: dealId, organizationId: session.user.organizationId },
    //   data: { stageId: newStageId, updatedAt: new Date() },
    // });

    // Simulate async DB call
    await new Promise((r) => setTimeout(r, 50));

    revalidatePath("/deals");
    return { ok: true, dealId, newStageId };
  } catch {
    return { error: "Errore durante lo spostamento dell'affare" };
  }
}

const updateSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  value: z.number().min(0).optional(),
  currency: z.string().optional(),
  expectedClose: z.string().nullable().optional(),
  status: z.enum(["OPEN", "WON", "LOST"]).optional(),
  lostReason: z.string().nullable().optional(),
});

export async function updateDeal(input: z.infer<typeof updateSchema>) {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: "Input non valido" };

  try {
    // TODO: real DB update
    revalidatePath("/deals");
    return { ok: true };
  } catch {
    return { error: "Errore durante l'aggiornamento" };
  }
}

export async function createDeal(input: {
  title: string;
  value: number;
  currency: string;
  stageId: string;
  pipelineId: string;
  expectedClose?: string;
}) {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  try {
    // TODO: real DB insert
    revalidatePath("/deals");
    return { ok: true, id: `deal-${Date.now()}` };
  } catch {
    return { error: "Errore durante la creazione" };
  }
}
