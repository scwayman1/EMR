// ---------------------------------------------------------------------------
// EMR-311 — Public clinician directory
// ---------------------------------------------------------------------------
// Server component. Renders the seed listings; the patient-state filter
// is a client island that calls into the compliance matcher.
// ---------------------------------------------------------------------------

import { listListings } from "@/lib/clinicians";
import { DirectoryFilters } from "./DirectoryFilters";

export default async function ClinicianDirectoryPage() {
  const listings = listListings();

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-12">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-accent font-bold mb-3">
          Find a clinician
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-text mb-3">
          Verified cannabis-friendly clinicians
        </h1>
        <p className="text-text-muted text-lg leading-relaxed max-w-2xl">
          We only show you clinicians who can legally see you for the visit
          you need — based on your state, what you're looking for, and any
          state cannabis-program rules in play.
        </p>
      </header>

      <DirectoryFilters listings={listings} />
    </div>
  );
}
