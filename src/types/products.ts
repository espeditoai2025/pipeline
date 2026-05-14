export type ProductCategory = "SOFTWARE" | "HARDWARE" | "SERVICE" | "SUPPORT" | "LICENSE" | "SAAS" | "WEBSITE" | "AI_AGENT" | "OTHER";

export type Product = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: ProductCategory;
  unitPrice: number;
  currency: string;
  taxRate: number;
  unit: string;
  isActive: boolean;
  isSubscription: boolean;
  billingPeriod: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DealProduct = {
  id: string;
  dealId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  currency: string;
  /** Computed: quantity * unitPrice * (1 - discount/100) */
  subtotal: number;
  /** Computed: subtotal * (1 + taxRate/100) */
  total: number;
  note: string | null;
  addedAt: string;
};

export type CreateProductInput = {
  name: string;
  code: string;
  description?: string;
  category: ProductCategory;
  unitPrice: number;
  currency: string;
  taxRate: number;
  unit: string;
  isSubscription?: boolean;
  billingPeriod?: string | null;
};

export type UpdateProductInput = Partial<CreateProductInput>;

export type AddDealProductInput = {
  dealId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  currency: string;
  note?: string;
};
