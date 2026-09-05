import { getInvoiceWorkspace } from "@/server/actions/invoice-workspace";
import { InvoiceWorkspace } from "@/components/invoices/InvoiceWorkspace";
import { invoiceFilters, type InvoiceFilter } from "@/lib/invoice-utils";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const filter = typeof params.filter === "string" && invoiceFilters.includes(params.filter as InvoiceFilter) ? params.filter as InvoiceFilter : "all";
  const requestedPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 100000) : 1;
  const data = await getInvoiceWorkspace({ q, filter, page });
  return <InvoiceWorkspace data={data} q={q} filter={filter} />;
}
