// EMR-311 — Public clinician profile

import { notFound } from "next/navigation";
import { getListingBySlug } from "@/lib/clinicians";

interface PageProps {
  params: { slug: string };
}

export default async function ClinicianProfilePage({ params }: PageProps) {
  const listing = getListingBySlug(decodeURIComponent(params.slug));
  if (!listing) notFound();

  const cashRate = (listing.cashRateCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <div className="max-w-[820px] mx-auto px-6 lg:px-12 py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-accent font-bold mb-3">
          {listing.credentials}
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-text mb-3">
          {listing.displayName}
        </h1>
        <p className="text-text-muted text-lg leading-relaxed">{listing.bio}</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card label="Licensed in" value={listing.licensedStates.join(", ")} />
        <Card
          label="Cannabis program enrollment"
          value={
            listing.cannabisProgramStates.length > 0
              ? listing.cannabisProgramStates.join(", ")
              : "None"
          }
        />
        <Card label="Services" value={listing.services.join(", ")} />
        <Card
          label="Insurance / cash"
          value={`${listing.acceptsInsurance ? "Accepts insurance · " : ""}Cash ${cashRate}`}
        />
      </section>

      <button
        type="button"
        className="px-6 py-3 rounded-full bg-accent text-white font-semibold hover:bg-accent/90 transition-all"
      >
        Request a visit
      </button>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
      <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">
        {label}
      </p>
      <p className="text-text">{value}</p>
    </div>
  );
}
