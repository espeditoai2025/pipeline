import { auth } from "@/lib/auth";
import { exportOrgData } from "@/server/actions/settings";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const result = await exportOrgData();
  if (result.error || !result.data) {
    return NextResponse.json({ error: result.error ?? "Errore" }, { status: 403 });
  }

  const date = new Date().toISOString().slice(0, 10);
  const json = JSON.stringify(result.data, null, 2);

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="pipely-export-${date}.json"`,
    },
  });
}
