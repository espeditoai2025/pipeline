import { NextResponse } from "next/server";
import { MOCK_PRODUCTS } from "@/lib/mock-products";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";
  const products = activeOnly ? MOCK_PRODUCTS.filter((p) => p.isActive) : MOCK_PRODUCTS;
  return NextResponse.json(products);
}
