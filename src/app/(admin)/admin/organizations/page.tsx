import { getAdminOrganizations } from "@/server/actions/admin";
import { redirect } from "next/navigation";
import { OrgsTable } from "./OrgsTable";

export default async function OrganizationsPage() {
  const orgs = await getAdminOrganizations();
  if (!orgs) redirect("/dashboard");
  return <OrgsTable orgs={orgs} />;
}
