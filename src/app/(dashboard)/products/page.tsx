import { getProducts } from "@/server/actions/products";
import { ProductsPageClient } from "@/components/products/ProductsPageClient";

export default async function ProductsPage() {
  const products = await getProducts();
  return <ProductsPageClient initialProducts={products} />;
}
