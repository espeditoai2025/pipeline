"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MOCK_PRODUCTS, MOCK_DEAL_PRODUCTS } from "@/lib/mock-products";
import type { Product, DealProduct, CreateProductInput, AddDealProductInput } from "@/types/products";

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
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input non valido" };

  const product: Product = {
    id: `prod-${Date.now()}`,
    ...parsed.data,
    description: parsed.data.description ?? null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  MOCK_PRODUCTS.unshift(product);
  revalidatePath("/products");
  return { data: product };
}

export async function updateProduct(
  id: string, input: Partial<CreateProductInput>
): Promise<ActionResult<Product>> {
  const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
  if (idx === -1) return { error: "Prodotto non trovato" };
  const prev = MOCK_PRODUCTS[idx]!;

  const updated: Product = {
    ...prev,
    ...input,
    description: input.description !== undefined ? (input.description ?? null) : prev.description,
    updatedAt: new Date().toISOString(),
  };
  MOCK_PRODUCTS[idx] = updated;
  revalidatePath("/products");
  return { data: updated };
}

export async function deleteProduct(id: string): Promise<ActionResult<void>> {
  const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
  if (idx === -1) return { error: "Prodotto non trovato" };
  MOCK_PRODUCTS.splice(idx, 1);
  revalidatePath("/products");
  return {};
}

export async function toggleProductActive(id: string, isActive: boolean): Promise<ActionResult<Product>> {
  const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
  if (idx === -1) return { error: "Prodotto non trovato" };
  const updated = { ...MOCK_PRODUCTS[idx]!, isActive, updatedAt: new Date().toISOString() };
  MOCK_PRODUCTS[idx] = updated;
  revalidatePath("/products");
  return { data: updated };
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
  const parsed = dealProductSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input non valido" };

  const product = MOCK_PRODUCTS.find((p) => p.id === input.productId);
  if (!product) return { error: "Prodotto non trovato" };

  const subtotal = input.unitPrice * input.quantity * (1 - input.discount / 100);
  const total = subtotal * (1 + input.taxRate / 100);

  const dp: DealProduct = {
    id: `dp-${Date.now()}`,
    dealId: input.dealId,
    product,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    discount: input.discount,
    taxRate: input.taxRate,
    currency: input.currency,
    subtotal,
    total,
    note: input.note ?? null,
    addedAt: new Date().toISOString(),
  };
  MOCK_DEAL_PRODUCTS.push(dp);
  revalidatePath("/deals");
  return { data: dp };
}

export async function updateDealProduct(
  id: string,
  updates: { quantity?: number; unitPrice?: number; discount?: number; note?: string }
): Promise<ActionResult<DealProduct>> {
  const idx = MOCK_DEAL_PRODUCTS.findIndex((dp) => dp.id === id);
  if (idx === -1) return { error: "Riga non trovata" };

  const prev = MOCK_DEAL_PRODUCTS[idx]!;
  const quantity = updates.quantity ?? prev.quantity;
  const unitPrice = updates.unitPrice ?? prev.unitPrice;
  const discount = updates.discount ?? prev.discount;
  const subtotal = unitPrice * quantity * (1 - discount / 100);
  const total = subtotal * (1 + prev.taxRate / 100);

  const updated: DealProduct = {
    ...prev,
    quantity,
    unitPrice,
    discount,
    subtotal,
    total,
    note: updates.note !== undefined ? (updates.note ?? null) : prev.note,
  };
  MOCK_DEAL_PRODUCTS[idx] = updated;
  revalidatePath("/deals");
  return { data: updated };
}

export async function removeProductFromDeal(id: string): Promise<ActionResult<void>> {
  const idx = MOCK_DEAL_PRODUCTS.findIndex((dp) => dp.id === id);
  if (idx === -1) return { error: "Riga non trovata" };
  MOCK_DEAL_PRODUCTS.splice(idx, 1);
  revalidatePath("/deals");
  return {};
}

export async function getDealProducts(dealId: string): Promise<ActionResult<DealProduct[]>> {
  const rows = MOCK_DEAL_PRODUCTS.filter((dp) => dp.dealId === dealId);
  return { data: rows };
}
