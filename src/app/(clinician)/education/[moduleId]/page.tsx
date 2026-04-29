// EMR-312 — Curriculum module page (lesson list)

import Link from "next/link";
import { notFound } from "next/navigation";
import { CURRICULUM_MODULES } from "@/lib/education/curriculum";
import { loadProgress } from "../actions";

const DEMO_LEARNER_ID = "demo-clinician";

interface PageProps {
  params: { moduleId: string };
}

export default async function ModulePage({ params }: PageProps) {
  const moduleId = decodeURIComponent(params.moduleId);
  const mod = CURRICULUM_MODULES.find((m) => m.id === moduleId);
  if (!mod) notFound();

  const progress = await loadProgress(DEMO_LEARNER_ID);
  const totalMin = mod.lessons.reduce((s, l) => s + l.durationMinutes, 0);

  return (
    <div className="max-w-[900px] mx-auto px-6 lg:px-12 py-12">
      <Link
        href="/education"
        className="text-sm text-accent font-semibold hover:underline"
      >
        ← All modules
      </Link>

      <header className="mt-4 mb-10">
        <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
          {(totalMin / 60).toFixed(1)} hrs · {mod.lessons.length} lessons ·{" "}
          {mod.cmeCategories.join(", ")}
        </p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-text mb-3">
          {mod.title}
        </h1>
        <p className="text-text-muted text-lg leading-relaxed">{mod.summary}</p>
      </header>

      <ol className="space-y-3">
        {mod.lessons.map((l, idx) => {
          const lp = progress.lessons[l.id];
          const status = lp?.completedAt
            ? "Complete"
            : lp?.startedAt
              ? "In progress"
              : "Not started";
          return (
            <li key={l.id}>
              <Link
                href={`/education/${encodeURIComponent(mod.id)}/${encodeURIComponent(l.id)}`}
                className="flex items-start gap-4 bg-white border border-slate-200 rounded-2xl p-5 hover:border-accent transition-all shadow-sm"
              >
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-accent/10 text-accent text-sm font-bold flex items-center justify-center">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-text">{l.title}</p>
                  <p className="text-sm text-text-muted leading-relaxed mt-1">
                    {l.summary}
                  </p>
                  <p className="text-xs text-text-muted mt-2">
                    {l.durationMinutes} min · {l.medium} · {l.level}
                  </p>
                </div>
                <span className="text-xs font-semibold text-accent">{status}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
