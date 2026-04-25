/**
 * Sophisticated tonal placeholder for portrait photography sections.
 * Looks intentional, not broken — diagonal warm gradient + soft shadow
 * halo where the head would be. From leafmart-medvi.jsx L543-595.
 */

interface PortraitPlaceholderProps {
  src?: string | null;
  tone?: "warm" | "sage" | "butter" | "rose" | "lilac";
  caption?: string;
  radius?: number;
  ratio?: string;
  bg?: string;
  className?: string;
}

const TONES = {
  warm: { a: "#F8DDC8", b: "#E8B68F", halo: "#D89A6E" },
  sage: { a: "#D8E5D0", b: "#A9C098", halo: "#7E9971" },
  butter: { a: "#F5E6B8", b: "#D9BC6E", halo: "#B8985A" },
  rose: { a: "#F1D4D0", b: "#D89E97", halo: "#B47971" },
  lilac: { a: "#E2D8E8", b: "#B8A5C6", halo: "#8D7BA0" },
} as const;

function PlaceholderSVG({ tone }: { tone: keyof typeof TONES }) {
  const t = TONES[tone];
  return (
    <svg
      viewBox="0 0 200 250"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`g-${tone}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={t.a} />
          <stop offset="100%" stopColor={t.b} />
        </linearGradient>
        <radialGradient id={`h-${tone}`} cx="50%" cy="38%" r="35%">
          <stop offset="0%" stopColor={t.halo} stopOpacity="0.55" />
          <stop offset="100%" stopColor={t.halo} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="250" fill={`url(#g-${tone})`} />
      <ellipse cx="100" cy="95" rx="54" ry="62" fill={`url(#h-${tone})`} />
      <text
        x="100"
        y="220"
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="9"
        fontWeight="500"
        fill={t.halo}
        opacity="0.7"
        letterSpacing="1.5"
      >
        PORTRAIT
      </text>
    </svg>
  );
}

export function Portrait({
  src,
  tone = "warm",
  caption,
  radius = 28,
  ratio = "4/5",
  bg,
  className = "",
}: PortraitPlaceholderProps) {
  return (
    <div
      className={className}
      style={{
        background: bg || "var(--peach)",
        borderRadius: radius,
        aspectRatio: ratio,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={caption || ""}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <PlaceholderSVG tone={tone} />
      )}
      {caption && (
        <div
          style={{
            position: "absolute",
            left: 14,
            bottom: 14,
            background: "rgba(255,255,255,0.92)",
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: 0.2,
            backdropFilter: "blur(6px)",
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}
