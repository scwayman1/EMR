import { ImageResponse } from "next/og";

/**
 * Default OG image for the Leafjourney marketing site.
 * Used by `/`, `/about`, `/security`, etc. unless a page declares its
 * own `opengraph-image.tsx`. The Leafmart storefront has its own
 * per-product OG generator at `app/leafmart/products/[slug]/opengraph-image.tsx`.
 *
 * Edge runtime — pure ImageResponse with no DB or filesystem reads.
 * `next/og` does not have access to CSS custom properties, so the design
 * tokens are inlined as hex literals. Keep these in sync with `globals.css`
 * (light-mode `.theme-leafmart` block).
 */

export const runtime = "edge";
export const alt = "Leafjourney — AI-native cannabis care platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = {
  bg: "#FFFCF7",      // --bg
  bgDeep: "#F6F0E4",  // --bg-deep
  ink: "#152119",     // --ink
  leaf: "#1F4D37",    // --leaf
  textSoft: "#4A5651",// --text-soft
  highlight: "#B8782F", // --highlight
};

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundImage: `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.bgDeep} 100%)`,
          padding: "80px 96px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Ambient washes — `next/og` supports a small subset of SVG so
            we approximate the homepage's radial gradient with two layered divs. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 700,
            height: 400,
            backgroundImage: `radial-gradient(ellipse at top right, ${COLORS.highlight}22 0%, transparent 70%)`,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 700,
            height: 400,
            backgroundImage: `radial-gradient(ellipse at bottom left, ${COLORS.leaf}22 0%, transparent 70%)`,
            display: "flex",
          }}
        />

        {/* Top — eyebrow + brand mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: COLORS.leaf,
              color: "#FFF8E8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            L
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: COLORS.ink,
              letterSpacing: -0.5,
            }}
          >
            Leafjourney
          </div>
        </div>

        {/* Middle — headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            marginTop: 48,
          }}
        >
          <div
            style={{
              fontSize: 84,
              lineHeight: 1.02,
              fontWeight: 500,
              letterSpacing: -2,
              color: COLORS.ink,
              maxWidth: 920,
            }}
          >
            Cannabis wellness,
          </div>
          <div
            style={{
              fontSize: 84,
              lineHeight: 1.02,
              fontWeight: 500,
              letterSpacing: -2,
              fontStyle: "italic",
              color: COLORS.leaf,
              maxWidth: 920,
            }}
          >
            doctor-guided.
          </div>
        </div>

        {/* Bottom — tagline + trust strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `1px solid ${COLORS.bgDeep}`,
            paddingTop: 28,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: COLORS.textSoft,
              fontWeight: 500,
              maxWidth: 700,
            }}
          >
            AI-native care platform · patient portal · clinician workspace · practice ops
          </div>
          <div
            style={{
              fontSize: 16,
              color: COLORS.leaf,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            Physician built
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
