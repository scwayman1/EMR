import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, MapPin as MapPinIcon, Navigation, Phone, Clock, Store, Stethoscope } from "lucide-react";

import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Eyebrow } from "@/components/ui/ornament";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SITE_URL } from "@/lib/seo";
import {
  DISPENSARY_PINS,
  PROVIDER_PINS,
  buildMapEmbedUrl,
  directionsUrl,
  placeSearchUrl,
  type MapPin,
} from "@/lib/integrations/dispensary-locator";

/**
 * EMR-017 — Dispensary Locator with Google Maps.
 *
 * Public, patient-facing map of local dispensaries and cannabis healthcare
 * providers. Uses the Google Maps Embed API when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * is configured; otherwise renders a directory with keyless "Get directions"
 * links so the page is always useful.
 */
export const metadata: Metadata = {
  title: "Dispensary Locator — Find dispensaries & cannabis providers near you — Leafjourney",
  description:
    "Locate licensed dispensaries and cannabis healthcare providers near you on an interactive map, with addresses, hours, and one-tap directions.",
  alternates: { canonical: `${SITE_URL}/education/dispensary-locator` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Dispensary Locator — Leafjourney",
    description:
      "Find local dispensaries and cannabis providers on an interactive map. No login required.",
    url: `${SITE_URL}/education/dispensary-locator`,
    siteName: "Leafjourney",
    type: "website",
  },
};

export default function DispensaryLocatorPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const embedUrl = buildMapEmbedUrl(apiKey);

  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />

      <main id="main-content">
        <section className="max-w-[1320px] mx-auto px-6 lg:px-12 pt-12 pb-8 lg:pt-16 lg:pb-10">
          <Link
            href="/education"
            className="inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-accent transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            Back to Education
          </Link>

          <div className="text-center">
            <Eyebrow className="justify-center mb-5 text-accent">
              <MapPinIcon className="w-3.5 h-3.5" aria-hidden="true" />
              Dispensary Locator
            </Eyebrow>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight text-text leading-[1.05] mb-5">
              Find dispensaries &amp; providers near you
            </h1>
            <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto leading-relaxed">
              Licensed dispensaries and cannabis healthcare providers, mapped
              with addresses, hours, and one-tap directions.
            </p>
          </div>
        </section>

        {/* Map */}
        <section className="max-w-[1320px] mx-auto px-6 lg:px-12 pb-12">
          {embedUrl ? (
            <div className="rounded-3xl overflow-hidden border border-border shadow-lg aspect-[16/9] bg-surface-muted">
              <iframe
                title="Map of nearby dispensaries and cannabis providers"
                src={embedUrl}
                className="w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          ) : (
            <Card className="rounded-3xl border border-dashed border-border">
              <CardContent className="p-10 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 text-accent mb-4">
                  <MapPinIcon className="w-7 h-7" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <p className="text-base font-semibold text-text">
                  Interactive map preview
                </p>
                <p className="text-sm text-text-muted mt-2 max-w-md mx-auto">
                  The live Google Map appears here once a Maps API key is
                  configured. In the meantime, browse the directory below — every
                  location links straight to directions.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Directory */}
        <section className="max-w-[1320px] mx-auto px-6 lg:px-12 pb-24 space-y-10">
          <PinGroup
            title="Dispensaries"
            icon={<Store className="w-4 h-4" aria-hidden="true" />}
            pins={DISPENSARY_PINS}
            tone="accent"
          />
          <PinGroup
            title="Cannabis healthcare providers"
            icon={<Stethoscope className="w-4 h-4" aria-hidden="true" />}
            pins={PROVIDER_PINS}
            tone="neutral"
          />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function PinGroup({
  title,
  icon,
  pins,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  pins: MapPin[];
  tone: "accent" | "neutral";
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <span
          className={
            tone === "accent"
              ? "inline-flex items-center justify-center w-8 h-8 rounded-xl bg-accent/10 text-accent"
              : "inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-slate-600"
          }
        >
          {icon}
        </span>
        <h2 className="font-display text-2xl text-text tracking-tight">{title}</h2>
        <Badge tone="neutral" className="ml-1 text-[10px]">
          {pins.length}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pins.map((pin) => (
          <Card key={pin.id} className="rounded-2xl border border-slate-200 hover:shadow-lg transition-all">
            <CardContent className="p-5 flex flex-col h-full">
              <h3 className="font-semibold text-text leading-snug mb-2">{pin.name}</h3>
              <p className="text-sm text-text-muted leading-relaxed mb-3">{pin.address}</p>
              <div className="space-y-1.5 text-xs text-text-muted mb-4">
                {pin.phone && (
                  <a
                    href={`tel:${pin.phone.replace(/[^0-9+]/g, "")}`}
                    className="inline-flex items-center gap-2 hover:text-accent transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                    {pin.phone}
                  </a>
                )}
                {pin.hours && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    {pin.hours}
                  </div>
                )}
              </div>
              <div className="mt-auto flex gap-2">
                <a
                  href={directionsUrl(pin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
                >
                  <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                  Get directions
                </a>
                <a
                  href={placeSearchUrl(pin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-accent transition-colors ml-auto"
                >
                  View on map
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
