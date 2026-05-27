interface AccountStatCardProps {
  label: string;
  value: string | number;
  bg?: string;
  deep?: string;
}

export function AccountStatCard({ label, value, bg = "var(--sage)", deep = "var(--leaf)" }: AccountStatCardProps) {
  return (
    <div
      className="rounded-[24px] p-6 flex flex-col gap-2"
      style={{ background: bg }}
    >
      <p className="eyebrow" style={{ color: deep }}>{label}</p>
      <p className="font-display text-[44px] leading-none font-normal tracking-[-1px]" style={{ color: "var(--ink)" }}>
        {value}
      </p>
    </div>
  );
}
