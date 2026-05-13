import { redirect } from "next/navigation";
import { DealsClient } from "@/components/pipeline/DealsClient";
import { getPipeline, getPipelineOwners } from "@/server/actions/pipeline";

export default async function DealsPage() {
  const [pipeline, owners] = await Promise.all([getPipeline(), getPipelineOwners()]);

  if (!pipeline) redirect("/login"); // session missing (not logged in)

  return (
    <DealsClient
      pipeline={pipeline}
      owners={owners.map((o) => ({ id: o.id, name: o.name ?? null, email: o.email }))}
    />
  );
}
