import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = (session?.user as { email?: string } | undefined)?.email;

  if (!process.env.ADMIN_EMAIL || email !== process.env.ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <AdminNav />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
