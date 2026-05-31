// EMR-310 — Lean, serializable shape for the "Compare similar items" table.
// Lives in a plain module (no "use client") so both the server PDP and the
// client CompareDrawer can build/consume it.

import type { MarketplaceProduct } from "@/lib/marketplace/types";
import { FORMAT_LABELS } from "@/lib/marketplace/types";

export interface CompareItem {
  slug: string;
  name: string;
  brand: string;
  price: number;
  compareAtPrice?: number;
  format: string;
  thcContent?: number;
  cbdContent?: number;
  averageRating: number;
  reviewCount: number;
  onsetTime?: string;
  duration?: string;
  beginnerFriendly: boolean;
  labVerified: boolean;
}

export function toCompareItem(p: MarketplaceProduct): CompareItem {
  return {
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    format: FORMAT_LABELS[p.format],
    thcContent: p.thcContent,
    cbdContent: p.cbdContent,
    averageRating: p.averageRating,
    reviewCount: p.reviewCount,
    onsetTime: p.onsetTime,
    duration: p.duration,
    beginnerFriendly: p.beginnerFriendly,
    labVerified: p.labVerified,
  };
}
