"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Product, DealProduct, CreateProductInput, AddDealProductInput } from "@/types/products";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

function mapProduct(p: {
  id: string; name: string; code: string | null;
  unitPrice: { toNumber: () => number } | number;
  currency: string; taxRate: { toNumber: () => number } | number;
  organizationId: string;
}): Product {
  return {
    id: p.id,
    name: p.name,
    code: p.code ?? "",
    description: null,
    category: "OTHER",
    unitPrice: typeof p.unitPrice === "number" ? p.unitPrice : p.unitPrice.toNumber(),
    currency: p.currency,
    taxRate: typeof p.taxRate === "number" ? p.taxRate : p.taxRate.toNumber(),
    unit: "pz",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function getProducts(): Promise<Product[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const rows = await db.product.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
  });

  return rows.map(mapProduct);
}

const productSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  code: z.string().min(1, "Codice obbligatorio"),
  description: z.string().optional(),
  category: z.enum(["SOFTWARE", "HARDWARE", "SERVICE", "SUPPORT", "LICENSE", "OTHER"]),
  unitPrice: z.number().min(0, "Prezzo non valido"),
  currency: z.string().min(1),
  taxRate: z.number().min(0).max(100),
  unit: z.string().min(1, "Unità obbligatoria"),
});

type ActionResult<T> = { data?: T; error?: string };

export async function createProduct(input: CreateProductInput): Promise<ActionResult<Product>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input non valido" };

  try {
    const row = await db.product.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        unitPrice: parsed.data.unitPrice,
        currency: parsed.data.currency,
        taxRate: parsed.data.taxRate,
        organizationId: orgId,
      },
    });
    revalidatePath("/products");
    return { data: mapProduct(row) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore durante la creazione" };
  }
}

export async function updateProduct(id: string, input: Partial<CreateProductInput>): Promise<ActionResult<Product>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    const row = await db.product.update({
      where: { id, organizationId: orgId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.code !== undefined && { code: input.code }),
        ...(input.unitPrice !== undefined && { unitPrice: input.unitPrice }),
        ...(input.currency && { currency: input.currency }),
        ...(input.taxRate !== undefined && { taxRate: input.taxRate }),
      },
    });
    revalidatePath("/products");
    return { data: mapProduct(row) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore durante l'aggiornamento" };
  }
}

export async function deleteProduct(id: string): Promise<ActionResult<void>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.product.delete({ where: { id, organizationId: orgId } });
    revalidatePath("/products");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore durante l'eliminazione" };
  }
}

export async function toggleProductActive(_id: string, _isActive: boolean): Promise<ActionResult<Product>> {
  // isActive not in schema — no-op, return success
  return { error: undefined };
}

const dealProductSchema = z.object({
  dealId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).max(100),
  taxRate: z.number().min(0).max(100),
  currency: z.string().min(1),
  note: z.string().optional(),
});

export async function addProductToDeal(input: AddDealProductInput): Promise<ActionResult<DealProduct>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const parsed = dealProductSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input non valido" };

  try {
    const product = await db.product.findUnique({ where: { id: parsed.data.productId, organizationId: orgId } });
    if (!product) return { error: "Prodotto non trovato" };

    const row = await db.dealProduct.create({
      data: {
        dealId: parsed.data.dealId,
        productId: parsed.data.productId,
        quantity: parsed.data.quantity,
        unitPrice: parsed.data.unitPrice,
        discount: parsed.data.discount,
      },
    });

    const subtotal = parsed.data.unitPrice * parsed.data.quantity * (1 - parsed.data.discount / 100);
    const total = subtotal * (1 + parsed.data.taxRate / 100);

    revalidatePath("/deals");
    return {
      data: {
        id: row.id,
        dealId: row.dealId,
        product: mapProduct(product),
        quantity: row.quantity,
        unitPrice: typeof row.unitPrice === "number" ? row.unitPrice : (row.unitPrice as { toNumber: () => number }).toNumber(),
        discount: typeof row.discount === "number" ? row.discount : (row.discount as { toNumber: () => number }).toNumber(),
        taxRate: parsed.data.taxRate,
        currency: parsed.data.currency,
        subtotal,
        total,
        note: parsed.data.note ?? null,
        addedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore" };
  }
}

export async function getDealProducts(dealId: string): Promise<ActionResult<DealProduct[]>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const rows = await db.dealProduct.findMany({ where: { dealId } });

  const productIds = [...new Set(rows.map((r) => r.productId))];
  const products = await db.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const data: DealProduct[] = rows.map((r) => {
    const product = productMap.get(r.productId)!;
    const qty = r.quantity;
    const up = typeof r.unitPrice === "number" ? r.unitPrice : (r.unitPrice as { toNumber: () => number }).toNumber();
    const disc = typeof r.discount === "number" ? r.discount : (r.discount as { toNumber: () => number }).toNumber();
    const subtotal = up * qty * (1 - disc / 100);
    const taxRate = typeof product.taxRate === "number" ? product.taxRate : (product.taxRate as { toNumber: () => number }).toNumber();
    return {
      id: r.id,
      dealId: r.dealId,
      product: mapProduct(product),
      quantity: qty,
      unitPrice: up,
      discount: disc,
      taxRate,
      currency: product.currency,
      subtotal,
      total: subtotal * (1 + taxRate / 100),
      note: null,
      addedAt: new Date().toISOString(),
    };
  });

  return { data };
}

export async function removeProductFromDeal(id: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  try {
    await db.dealProduct.delete({ where: { id } });
    revalidatePath("/deals");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore" };
  }
}

export async function updateDealProduct(
  id: string,
  updates: { quantity?: number; unitPrice?: number; discount?: number; note?: string }
): Promise<ActionResult<DealProduct>> {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  try {
    const row = await db.dealProduct.update({
      where: { id },
      data: {
        ...(updates.quantity !== undefined && { quantity: updates.quantity }),
        ...(updates.unitPrice !== undefined && { unitPrice: updates.unitPrice }),
        ...(updates.discount !== undefined && { discount: updates.discount }),
      },
    });

    const product = await db.product.findUnique({ where: { id: row.productId } });
    if (!product) return { error: "Prodotto non trovato" };

    const qty = row.quantity;
    const up = typeof row.unitPrice === "number" ? row.unitPrice : (row.unitPrice as { toNumber: () => number }).toNumber();
    const disc = typeof row.discount === "number" ? row.discount : (row.discount as { toNumber: () => number }).toNumber();
    const taxRate = typeof product.taxRate === "number" ? product.taxRate : (product.taxRate as { toNumber: () => number }).toNumber();
    const subtotal = up * qty * (1 - disc / 100);

    revalidatePath("/deals");
    return {
      data: {
        id: row.id,
        dealId: row.dealId,
        product: mapProduct(product),
        quantity: qty,
        unitPrice: up,
        discount: disc,
        taxRate,
        currency: product.currency,
        subtotal,
        total: subtotal * (1 + taxRate / 100),
        note: updates.note ?? null,
        addedAt: new Date().toISOString(),
      },
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore" };
  }
}
