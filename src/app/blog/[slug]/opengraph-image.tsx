import { ImageResponse } from "next/og";
import { getBlogPost } from "@/lib/blog-data";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  const title = post?.title ?? "Blog Pipely";
  const category = post?.category ?? "Articolo";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #0d1b2e 0%, #0f2340 50%, #0a1628 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "56px 72px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />

        {/* Top row: brand + category badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4A90E2" }} />
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00C9A7" }} />
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 20, fontWeight: 700, marginLeft: 4 }}>pipely.it</div>
          </div>
          <div style={{
            background: "rgba(74,144,226,0.2)",
            border: "1.5px solid rgba(74,144,226,0.5)",
            borderRadius: 20,
            padding: "4px 14px",
            color: "#7ab8f5",
            fontSize: 14,
            fontWeight: 600,
          }}>{category}</div>
        </div>

        {/* Title */}
        <div style={{
          color: "#ffffff",
          fontSize: title.length > 60 ? 36 : 44,
          fontWeight: 800,
          lineHeight: 1.25,
          maxWidth: 900,
          flex: 1,
        }}>
          {title}
        </div>

        {/* Bottom: CTA pill */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginTop: 40,
        }}>
          <div style={{
            background: "#00C9A7",
            borderRadius: 20,
            padding: "8px 20px",
            color: "#0a1628",
            fontSize: 16,
            fontWeight: 700,
          }}>Blog CRM</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>
            Leggi su pipely.it/blog
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
