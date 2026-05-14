import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Pipely CRM — Chiudi più affari. Lavora meno.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
        {/* Grid overlay subtle */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />

        {/* Top row: CRM badge + domain */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
          <div style={{
            background: "rgba(74,144,226,0.2)",
            border: "1.5px solid rgba(74,144,226,0.6)",
            borderRadius: 20,
            padding: "5px 16px",
            color: "#7ab8f5",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 1,
          }}>CRM</div>
          {/* Pipeline dots logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4A90E2" }} />
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00C9A7" }} />
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 18, fontWeight: 600, marginLeft: 4 }}>pipely.it</div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flex: 1, alignItems: "flex-start" }}>
          {/* Left: text */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ color: "#ffffff", fontSize: 120, fontWeight: 900, lineHeight: 1, letterSpacing: -4, marginBottom: 8 }}>
              Pipely
            </div>
            {/* Teal underline */}
            <div style={{ width: 120, height: 6, borderRadius: 3, background: "#00C9A7", marginBottom: 32 }} />
            <div style={{ color: "#ffffff", fontSize: 38, fontWeight: 700, lineHeight: 1.25, marginBottom: 8 }}>
              Chiudi più affari.
            </div>
            <div style={{ color: "#00C9A7", fontSize: 38, fontWeight: 700, lineHeight: 1.25 }}>
              Lavora meno.
            </div>
          </div>

          {/* Right: pipeline graphic */}
          <div style={{ position: "relative", width: 320, height: 360, display: "flex" }}>
            {/* Large teal circle top-right */}
            <div style={{
              position: "absolute", top: 20, right: 20,
              width: 110, height: 110, borderRadius: "50%",
              border: "6px solid #00C9A7",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#00C9A7" }} />
            </div>
            {/* Medium blue circle center */}
            <div style={{
              position: "absolute", top: 170, right: 130,
              width: 72, height: 72, borderRadius: "50%",
              background: "#2D6FDB",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#4A90E2" }} />
            </div>
            {/* Small blue circle bottom-left */}
            <div style={{
              position: "absolute", bottom: 30, right: 230,
              width: 50, height: 50, borderRadius: "50%",
              background: "#5BA3F5",
            }} />
          </div>
        </div>

        {/* Bottom-right: CTA pill */}
        <div style={{
          position: "absolute", bottom: 52, right: 72,
          background: "rgba(255,255,255,0.08)",
          border: "1.5px solid rgba(255,255,255,0.2)",
          borderRadius: 28,
          padding: "12px 28px",
          color: "rgba(255,255,255,0.9)",
          fontSize: 20,
          fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          → pipely.it
        </div>
      </div>
    ),
    { ...size }
  );
}
