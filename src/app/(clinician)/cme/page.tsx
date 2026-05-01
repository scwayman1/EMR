// ---------------------------------------------------------------------------
// EMR-312 — Clinician curriculum dashboard
// ---------------------------------------------------------------------------
// Server component. Renders the catalog grouped by track with a CME
// progress strip. Lesson progress and credits come from the in-memory
// progress store (will be Prisma-backed once the migration lands).
// ---------------------------------------------------------------------------

import Link from "next/link";
import {
  CURRICULUM_MODULES,
  totalCatalogHours,
  awardedCmeCredits,
} from "@/lib/education/curriculum";
import { loadProgress } from "./actions";

const TRACK_LABEL: Record<string, string> = {
  foundations: "Foundations",
  pharmacology: "Pharmacology",
  "clinical-application": "Clinical application",
  "special-populations": "Special populations",
  regulatory: "Regulatory",
  "research-methods": "Research methods",
};

// V1 shim — until clinician auth is wired into this surface.
const DEMO_LEARNER_ID = "demo-clinician";

export default async function CurriculumHomePage() {
  const progress = await loadProgress(DEMO_LEARNER_ID);
  const totalHours = totalCatalogHours();
  const credits = awardedCmeCredits(progress);

  // Group modules by track in catalog order.
  const tracks = new Map<string, typeof CURRICULUM_MODULES>();
  for (const m of CURRICULUM_MODULES) {
    if (!tracks.has(m.track)) tracks.set(m.track, []);
    tracks.get(m.track)!.push(m);
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-12">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-widest text-accent font-bold mb-3">
          Continuing medical education
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight text-text mb-3">
          Cannabis medicine, end to end
        </h1>
        <p className="text-text-muted max-w-2xl text-lg leading-relaxed">
          {totalHours.toFixed(0)}+ hours of CME-eligible material across six
          tracks, built by Leafjourney's medical board. Complete a track end-to-end
          and we mint a certificate accredited under AMA PRA Category 1.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        <CmeStat label="Catalog hours" value={`${totalHours.toFixed(0)}+`} />
        <CmeStat label="CME credits earned" value={`${credits}`} />
        <CmeStat
          label="Lessons completed"
          value={`${
            Object.values(progress.lessons).filter((l) => l.completedAt).length
          }`}
        />
      </section>

      <div className="space-y-12">
        {Array.from(tracks.entries()).map(([track, modules]) => (
          <section key={track}>
            <h2 className="font-display text-2xl text-text mb-4">
              {TRACK_LABEL[track] ?? track}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {modules.map((m) => {
                const totalMin = m.lessons.reduce(
                  (sum, l) => sum + l.durationMinutes,
                  0,
                );
                const completed = m.lessons.filter(
                  (l) => progress.lessons[l.id]?.completedAt,
                ).length;
                return (
                  <Link
                    key={m.id}
                    href={`/cme/${encodeURIComponent(m.id)}`}
                    className="block bg-white border border-slate-200 rounded-2xl p-6 hover:border-accent hover:-translate-y-0.5 transition-all shadow-sm"
                  >
                    <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
                      {(totalMin / 60).toFixed(1)} hrs · {m.lessons.length} lessons
                    </p>
                    <h3 className="font-display text-lg text-text mb-2">
                      {m.title}
                    </h3>
                    <p className="text-sm text-text-muted leading-relaxed">
                      {m.summary}
                    </p>
                    <p className="text-xs text-accent font-semibold mt-3">
                      {completed} / {m.lessons.length} complete
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function CmeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
      <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">
        {label}
      </p>
      <p className="font-display text-3xl text-text">{value}</p>
    </div>
  );
}
