import { getAdminOverview } from "@/server/actions/admin";
import { redirect } from "next/navigation";
import { AdminDashboard } from "./AdminDashboard";

export default async function AdminPage() {
  const data = await getAdminOverview();
  if (!data) redirect("/dashboard");
  return <AdminDashboard data={data} />;
}
