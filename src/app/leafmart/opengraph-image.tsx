import { ImageResponse } from "next/og";
import { OG_COLORS } from "@/lib/leafmart/og-colors";

export const runtime = "nodejs";
export const alt = "Leafmart — physician-curated cannabis wellness";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function StorefrontOG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: `linear-gradient(135deg, ${OG_COLORS.sage} 0%, ${OG_COLORS.bgDeep} 100%)`,
          fontFamily: "sans-serif",
          color: OG_COLORS.ink,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: OG_COLORS.leaf,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFF8E8",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            L
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>Leafmart</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
          <div
            style={{
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: 4,
              color: OG_COLORS.leaf,
              fontWeight: 500,
            }}
          >
            Physician-Curated Cannabis Wellness
          </div>
          <div
            style={{
              fontSize: 88,
              lineHeight: 1.05,
              fontWeight: 400,
              letterSpacing: -2,
              color: OG_COLORS.ink,
            }}
          >
            Every product reviewed. Lab verified. Outcome informed.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 22,
            color: OG_COLORS.textSoft,
          }}
        >
          <span>· Clinician reviewed</span>
          <span>· Third-party lab tested</span>
          <span>· Real patient outcomes</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
