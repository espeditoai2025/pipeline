import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

type NominatimResult = {
  name: string;
  display_name: string;
  type: string;
  class: string;
  addresstype: string;
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("countrycodes", "it");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "8");
    url.searchParams.set("addressdetails", "0");
    url.searchParams.set("featuretype", "settlement");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Pipely-CRM/1.0 (contact: espeditoai2025@gmail.com)",
        "Accept-Language": "it",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return NextResponse.json([]);

    const data = (await res.json()) as NominatimResult[];

    // Keep only settlement types, deduplicate by name
    const seen = new Set<string>();
    const suggestions = data
      .filter((r) => ["city", "town", "village", "municipality", "hamlet", "suburb", "quarter"].includes(r.type) || r.class === "place" || r.addresstype === "city" || r.addresstype === "town" || r.addresstype === "village")
      .map((r) => {
        // display_name = "Mormanno, Cosenza, Calabria, Italy" — trim to first 2 parts
        const parts = r.display_name.split(",").map((p) => p.trim());
        const short = parts.slice(0, 2).join(", ").replace(/, Italia$/, "").replace(/, Italy$/, "");
        return short;
      })
      .filter((s) => {
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      });

    return NextResponse.json(suggestions);
  } catch {
    return NextResponse.json([]);
  }
}
