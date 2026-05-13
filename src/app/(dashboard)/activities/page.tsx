import { getActivities } from "@/server/actions/activities";
import { ActivitiesPageClient } from "@/components/activities/ActivitiesPageClient";

export default async function ActivitiesPage() {
  const activities = await getActivities();
  return <ActivitiesPageClient initialActivities={activities} />;
}
