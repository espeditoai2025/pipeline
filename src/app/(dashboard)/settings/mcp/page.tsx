import { McpSettings } from "@/components/settings/McpSettings";
import { getMcpSettings } from "@/server/actions/mcp";
export default async function McpSettingsPage() {
  const result = await getMcpSettings();
  if (!result.data) return <p role="alert">{result.error}</p>;
  return <McpSettings initial={result.data} />;
}
