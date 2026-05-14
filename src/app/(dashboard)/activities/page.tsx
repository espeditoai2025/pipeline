import { Suspense } from "react";
import { getActivities } from "@/server/actions/activities";
import { getGoogleCalendarStatus } from "@/server/actions/google-calendar";
import { ActivitiesPageClient } from "@/components/activities/ActivitiesPageClient";

export default async function ActivitiesPage() {
  const [activities, gcal] = await Promise.all([getActivities(), getGoogleCalendarStatus()]);
  return (
    <Suspense>
      <ActivitiesPageClient
        initialActivities={activities}
        gcalConnected={gcal.connected}
        gcalConfigured={gcal.configured}
      />
    </Suspense>
  );
}
