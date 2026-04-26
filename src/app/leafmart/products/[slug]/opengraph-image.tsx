import { ImageResponse } from "next/og";
import { getProductBySlug } from "@/lib/leafmart/products";
import { OG_COLORS, resolveColor } from "@/lib/leafmart/og-colors";

export const runtime = "nodejs";
export const alt = "Leafmart product";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface SilhouetteProps {
  shape: "bottle" | "can" | "jar" | "tin" | "serum" | "box";
  color: string;
}

/**
 * Pure-div silhouette — `next/og` only supports a tiny subset of SVG, and
 * stacked rounded boxes give us a recognizable shape for each format
 * without shipping path data through ImageResponse.
 */
function Silhouette({ shape, color }: SilhouetteProps) {
  const base: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
  };

  switch (shape) {
    case "can":
      return (
        <div style={{ ...base }}>
          <div style={{ width: 30, height: 12, background: color, borderRadius: 6, opacity: 0.4 }} />
          <div style={{ width: 200, height: 320, background: color, borderRadius: 24, marginTop: 6 }} />
        </div>
      );
    case "jar":
      return (
        <div style={{ ...base }}>
          <div style={{ width: 140, height: 28, background: color, borderRadius: 8, opacity: 0.85 }} />
          <div style={{ width: 220, height: 260, background: color, borderRadius: 24, marginTop: 4 }} />
        </div>
      );
    case "tin":
      return (
        <div style={{ ...base }}>
          <div style={{ width: 260, height: 200, background: color, borderRadius: 28 }} />
        </div>
      );
    case "serum":
      return (
        <div style={{ ...base }}>
          <div style={{ width: 18, height: 50, background: color, borderRadius: 4 }} />
          <div style={{ width: 70, height: 26, background: color, borderRadius: 4, marginTop: 2 }} />
          <div style={{ width: 160, height: 280, background: color, borderRadius: 14, marginTop: 2 }} />
        </div>
      );
    case "box":
      return (
        <div style={{ ...base }}>
          <div style={{ width: 280, height: 320, background: color, borderRadius: 14 }} />
        </div>
      );
    case "bottle":
    default:
      return (
        <div style={{ ...base }}>
          <div style={{ width: 32, height: 28, background: color, borderRadius: 4 }} />
          <div style={{ width: 60, height: 36, background: color, borderRadius: 4, marginTop: 2 }} />
          <div style={{ width: 180, height: 280, background: color, borderRadius: 18, marginTop: 2 }} />
        </div>
      );
  }
}

export default async function ProductOG({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);

  // If the product disappears, render a generic Leafmart card rather than
  // 404'ing the OG image — broken OG previews look worse than a fallback.
  const name = product?.name ?? "Leafmart product";
  const partner = product?.partner ?? "LEAFMART";
  const formatLabel = product?.formatLabel ?? "Cannabis wellness";
  const support = product?.support ?? "Physician-curated cannabis wellness.";
  const price = product?.price ?? 0;
  const dose = product?.dose ?? "";
  const tag = product?.tag;

  const bg = resolveColor(product?.bg, OG_COLORS.sage);
  const deep = resolveColor(product?.deep, OG_COLORS.leaf);
  const shape = product?.shape ?? "bottle";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: OG_COLORS.bg,
          fontFamily: "sans-serif",
          color: OG_COLORS.ink,
        }}
      >
        {/* Silhouette panel */}
        <div
          style={{
            width: 480,
            height: "100%",
            background: `linear-gradient(180deg, ${bg} 0%, ${OG_COLORS.bgDeep} 100%)`,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: 60,
          }}
        >
          <Silhouette shape={shape} color={deep} />
        </div>

        {/* Info panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px 64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                background: OG_COLORS.leaf,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFF8E8",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              L
            </div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>Leafmart</div>
            {tag && (
              <div
                style={{
                  marginLeft: 14,
                  padding: "6px 14px",
                  borderRadius: 999,
                  background: OG_COLORS.leaf,
                  color: "#FFF8E8",
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                {tag}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                fontSize: 18,
                textTransform: "uppercase",
                letterSpacing: 3,
                color: OG_COLORS.muted,
                fontWeight: 500,
              }}
            >
              {partner} · {formatLabel}
            </div>
            <div
              style={{
                fontSize: 64,
                lineHeight: 1.05,
                fontWeight: 500,
                letterSpacing: -1.5,
                color: OG_COLORS.ink,
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontSize: 22,
                lineHeight: 1.4,
                color: OG_COLORS.textSoft,
                maxWidth: 600,
              }}
            >
              {support}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `1px solid ${OG_COLORS.bgDeep}`,
              paddingTop: 28,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <div style={{ fontSize: 56, fontWeight: 500, color: OG_COLORS.ink }}>${price}</div>
              {dose && (
                <div style={{ fontSize: 20, color: OG_COLORS.muted }}>· {dose}</div>
              )}
            </div>
            <div
              style={{
                fontSize: 18,
                color: OG_COLORS.leaf,
                fontWeight: 600,
                letterSpacing: 1,
              }}
            >
              CLINICIAN REVIEWED
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
