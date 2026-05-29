import { ShieldCheck, Truck, Store, PackageCheck } from "lucide-react";
import type { Distributor, DistributorTier } from "@/lib/leafmart/distributors";
import { trustLabel } from "@/lib/leafmart/distributors";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

// EMR-302 — Distributor / curated-catalog trust signal.
//
// Leafmart is a distributor: we present products we curate but don't hold
// inventory ourselves. Each product's fulfilling distributor (and our
// "curated, not warehoused" stance) is surfaced so the shopper always
// knows who ships, who handles returns, and that the SKU was vetted.

const TIER_ICON: Record<DistributorTier, typeof Truck> = {
  "first-party": Store,
  partner: ShieldCheck,
  marketplace: Store,
  "drop-ship": Truck,
  "external-feed": PackageCheck,
};

const TIER_LABEL: Record<DistributorTier, string> = {
  "first-party": "Leafmart fulfilled",
  partner: "Partner brand",
  marketplace: "Marketplace vendor",
  "drop-ship": "Drop-ship",
  "external-feed": "External feed",
};

export function DistributorBadge({
  distributor,
  className,
}: {
  distributor: Distributor;
  className?: string;
}) {
  const Icon = TIER_ICON[distributor.tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] text-text-muted",
        className,
      )}
    >
      <Icon width={14} height={14} className="text-accent" />
      <span className="font-medium text-text">{TIER_LABEL[distributor.tier]}</span>
      <span className="text-text-subtle">· {distributor.shipsFrom}</span>
    </span>
  );
}

/** Fuller distributor card used on the PDP and distributor directory. */
export function DistributorCard({ distributor }: { distributor: Distributor }) {
  const Icon = TIER_ICON[distributor.tier];
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent">
            <Icon width={18} height={18} />
          </span>
          <div>
            <p className="font-medium text-text leading-tight">{distributor.name}</p>
            <p className="text-[12px] text-text-subtle">{TIER_LABEL[distributor.tier]}</p>
          </div>
        </div>
        <Badge tone={distributor.trust === "verified" ? "success" : "accent"}>
          {trustLabel(distributor)}
        </Badge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
        <div>
          <dt className="text-text-subtle">Ships from</dt>
          <dd className="text-text">{distributor.shipsFrom}</dd>
        </div>
        <div>
          <dt className="text-text-subtle">Handling time</dt>
          <dd className="text-text">{distributor.handlingTimeHours}h</dd>
        </div>
        <div>
          <dt className="text-text-subtle">Returns window</dt>
          <dd className="text-text">{distributor.policies.returnsWindowDays} days</dd>
        </div>
        <div>
          <dt className="text-text-subtle">COA provided</dt>
          <dd className="text-text">{distributor.policies.coaProvided ? "Yes" : "No"}</dd>
        </div>
      </dl>
    </div>
  );
}
