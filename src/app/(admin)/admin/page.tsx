import { getAdminOverview, getAdminPlanStats } from "@/server/actions/admin";
import { redirect } from "next/navigation";
import { AdminDashboard } from "./AdminDashboard";

export default async function AdminPage() {
  const [data, planStats] = await Promise.all([getAdminOverview(), getAdminPlanStats()]);
  if (!data) redirect("/dashboard");
  return <AdminDashboard data={data} planStats={planStats} />;
}
