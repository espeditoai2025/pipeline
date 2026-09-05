import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getInvoiceDetail } from "@/server/actions/invoices";
import { InvoiceDetailClient } from "@/components/invoices/InvoiceDetailClient";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice, session] = await Promise.all([getInvoiceDetail(id), auth()]);
  if (!invoice) notFound();
  const canWrite = ["OWNER", "ADMIN", "MANAGER", "SALES"].includes((session?.user as { role?: string } | undefined)?.role ?? "");
  return <InvoiceDetailClient invoice={invoice} canWrite={canWrite} />;
}
