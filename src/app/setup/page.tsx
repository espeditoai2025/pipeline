import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isCrmModeSet } from "@/server/actions/crm-mode";
import { SetupWizard } from "@/components/setup/SetupWizard";

export default async function SetupPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const alreadySet = await isCrmModeSet();
  if (alreadySet) redirect("/dashboard");

  return <SetupWizard />;
}
