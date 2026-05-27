// Leafmart format design tokens — one visual treatment per product format.
//
// Each format has a tonal gradient, a paired ink color for icon + text
// overlays, and a canonical label. The gradients are tuned to the
// existing globals.css palette (cream / moss / amber / gold) so the
// whole surface reads as a warm editorial magazine, not a rainbow.

import type { ProductFormat } from "@/lib/marketplace/types";

export interface FormatVisual {
  /** Tailwind classes applied to the tile background */
  tileClass: string;
  /** Tailwind class for the icon + label color on the tile */
  inkClass: string;
  /** Short human label (singular) */
  label: string;
}

export const FORMAT_VISUALS: Record<ProductFormat, FormatVisual> = {
  tincture: {
    tileClass:
      "bg-[linear-gradient(135deg,#F4E3BC_0%,#E6C98A_55%,#D4A757_100%)]",
    inkClass: "text-[#5B3A10]",
    label: "Tincture",
  },
  flower: {
    tileClass:
      "bg-[linear-gradient(135deg,#C9D7B2_0%,#8AA878_55%,#4F6A47_100%)]",
    inkClass: "text-[#1F3222]",
    label: "Flower",
  },
  edible: {
    tileClass:
      "bg-[linear-gradient(135deg,#F0D1C6_0%,#D99A7F_55%,#A0593E_100%)]",
    inkClass: "text-[#4A1E0F]",
    label: "Edible",
  },
  topical: {
    tileClass:
      "bg-[linear-gradient(135deg,#E8E4D0_0%,#BDC6A5_55%,#7C8D6B_100%)]",
    inkClass: "text-[#2B3423]",
    label: "Topical",
  },
  capsule: {
    tileClass:
      "bg-[linear-gradient(135deg,#EFE3CF_0%,#C6A982_55%,#8C6B43_100%)]",
    inkClass: "text-[#3E2812]",
    label: "Capsule",
  },
  vape: {
    tileClass:
      "bg-[linear-gradient(135deg,#4A463E_0%,#2E2B26_55%,#1A1814_100%)]",
    inkClass: "text-[#E6CE9A]",
    label: "Vaporizer",
  },
  concentrate: {
    tileClass:
      "bg-[linear-gradient(135deg,#F6E7B9_0%,#E0BF6A_55%,#B58830_100%)]",
    inkClass: "text-[#3E2A0A]",
    label: "Concentrate",
  },
  patch: {
    tileClass:
      "bg-[linear-gradient(135deg,#F2EAD7_0%,#DECDA5_55%,#B19966_100%)]",
    inkClass: "text-[#3E2F17]",
    label: "Patch",
  },
  beverage: {
    tileClass:
      "bg-[linear-gradient(135deg,#E4ECE8_0%,#B5CCC4_55%,#4E6F67_100%)]",
    inkClass: "text-[#1F332F]",
    label: "Beverage",
  },
  serum: {
    tileClass:
      "bg-[linear-gradient(135deg,#F1D4D0_0%,#D89E97_55%,#9E4D45_100%)]",
    inkClass: "text-[#3E1F1B]",
    label: "Serum",
  },
};

// Founding-partner brand identities. Kept in the warm / editorial
// palette — each brand gets a tonal block (not a saturated logo color)
// so the spotlight reads as a curated shelf, not an ad banner.
export interface BrandIdentity {
  /** Exact brand name as seeded on the Product rows */
  name: string;
  tagline: string;
  tileClass: string;
  inkClass: string;
}

/**
 * EMR-204: Only confirmed founding-partner brands belong here. Until
 * agreements close, this list is intentionally empty so we never render
 * speculative brands as if they were live partners. Add entries below
 * as deals close.
 */
export const FOUNDING_PARTNER_BRANDS: BrandIdentity[] = [];
