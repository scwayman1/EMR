// EMR-017 — mock dispensary locations used by the locator scaffold.
//
// Replace with real partner data once the dispensary onboarding /
// SKU ingestion flow (EMR-002) has live tenants. Until then this
// powers the map demo so clinicians can see the layout.

import type { DispensaryGeo } from "./types";

export interface MockDispensary {
  id: string;
  slug: string;
  name: string;
  geo: DispensaryGeo;
  skuCount: number;
}

export const MOCK_DISPENSARIES: MockDispensary[] = [
  {
    id: "disp_demo_greenleaf",
    slug: "greenleaf-wellness",
    name: "Greenleaf Wellness",
    skuCount: 184,
    geo: {
      lat: 42.3601,
      lng: -71.0589,
      addressLine1: "210 Tremont St",
      city: "Boston",
      state: "MA",
      postalCode: "02116",
      phone: "(617) 555-0118",
      hoursLine: "Mon–Sun 9am–9pm",
    },
  },
  {
    id: "disp_demo_terraflower",
    slug: "terraflower-collective",
    name: "Terraflower Collective",
    skuCount: 96,
    geo: {
      lat: 42.3736,
      lng: -71.1097,
      addressLine1: "1180 Mass Ave",
      city: "Cambridge",
      state: "MA",
      postalCode: "02138",
      phone: "(617) 555-0144",
      hoursLine: "Mon–Sat 10am–8pm",
    },
  },
  {
    id: "disp_demo_seasidegreens",
    slug: "seaside-greens",
    name: "Seaside Greens Apothecary",
    skuCount: 142,
    geo: {
      lat: 42.486,
      lng: -70.9408,
      addressLine1: "55 Salem St",
      city: "Lynn",
      state: "MA",
      postalCode: "01901",
      phone: "(781) 555-0167",
      hoursLine: "Mon–Sun 10am–9pm",
    },
  },
  {
    id: "disp_demo_evergrove",
    slug: "evergrove-dispensary",
    name: "Evergrove Dispensary",
    skuCount: 78,
    geo: {
      lat: 42.2626,
      lng: -71.8023,
      addressLine1: "640 Main St",
      city: "Worcester",
      state: "MA",
      postalCode: "01608",
      phone: "(508) 555-0182",
      hoursLine: "Mon–Sat 10am–8pm",
    },
  },
  {
    id: "disp_demo_canopy",
    slug: "canopy-cannabis-co",
    name: "Canopy Cannabis Co.",
    skuCount: 213,
    geo: {
      lat: 42.4072,
      lng: -71.3824,
      addressLine1: "330 Concord St",
      city: "Lexington",
      state: "MA",
      postalCode: "02420",
      phone: "(781) 555-0192",
      hoursLine: "Mon–Sun 9am–10pm",
    },
  },
];
