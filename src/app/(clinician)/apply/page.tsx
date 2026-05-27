// ---------------------------------------------------------------------------
// EMR-311 — Clinician application form
// ---------------------------------------------------------------------------
// Server-rendered form posts to a server action. The action validates with
// Zod, records the application, and returns either a success message or
// per-field errors that re-render in the form.
// ---------------------------------------------------------------------------

import { ApplicationForm } from "./ApplicationForm";

export default function ApplyPage() {
  return (
    <div className="max-w-[820px] mx-auto px-6 lg:px-12 py-12">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-widest text-accent font-bold mb-3">
          For clinicians
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-text mb-3">
          Join the Leafjourney directory
        </h1>
        <p className="text-text-muted text-lg leading-relaxed max-w-2xl">
          We verify your medical license, DEA registration, and any state
          cannabis-program enrollment before you appear in the directory.
          Tell us what you practice and we'll match patients legally and
          accurately.
        </p>
      </header>

      <ApplicationForm />
    </div>
  );
}
