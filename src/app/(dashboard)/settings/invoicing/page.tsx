import { InvoicingSettings } from "@/components/settings/InvoicingSettings";
import { getInvoicingSettings } from "@/server/actions/invoicing";
export default async function InvoicingPage({ searchParams }: { searchParams: Promise<{ connection?: string }> }) {
  const result = await getInvoicingSettings(); const params = await searchParams;
  if (!result.data) return <p role="alert">{result.error}</p>;
  return <InvoicingSettings initial={result.data} connectionResult={params.connection} />;
}
