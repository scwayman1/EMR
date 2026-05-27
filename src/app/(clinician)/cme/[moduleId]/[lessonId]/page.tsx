// EMR-312 — Lesson player. V1 ships the layout; the actual media player
// is wired by lesson.medium downstream.

import Link from "next/link";
import { notFound } from "next/navigation";
import { CURRICULUM_MODULES } from "@/lib/education/curriculum";
import { LessonComplete } from "./LessonComplete";

interface PageProps {
  params: { moduleId: string; lessonId: string };
}

export default async function LessonPage({ params }: PageProps) {
  const moduleId = decodeURIComponent(params.moduleId);
  const lessonId = decodeURIComponent(params.lessonId);
  const mod = CURRICULUM_MODULES.find((m) => m.id === moduleId);
  const lesson = mod?.lessons.find((l) => l.id === lessonId);
  if (!mod || !lesson) notFound();

  return (
    <div className="max-w-[820px] mx-auto px-6 lg:px-12 py-12">
      <Link
        href={`/cme/${encodeURIComponent(mod.id)}`}
        className="text-sm text-accent font-semibold hover:underline"
      >
        ← {mod.title}
      </Link>

      <header className="mt-4 mb-8">
        <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-2">
          {lesson.medium} · {lesson.durationMinutes} min · {lesson.level}
        </p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-text mb-3">
          {lesson.title}
        </h1>
        <p className="text-text-muted text-lg leading-relaxed">
          {lesson.summary}
        </p>
      </header>

      {/* Player surface — content vendored separately from /data/curriculum */}
      <div className="aspect-video w-full bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center mb-6">
        <p className="text-sm text-text-muted">
          [{lesson.medium} player goes here]
        </p>
      </div>

      {lesson.assessment && lesson.assessment.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
          <h2 className="font-semibold text-text mb-4">Knowledge check</h2>
          <ol className="space-y-4 text-sm text-text">
            {lesson.assessment.map((q, idx) => (
              <li key={q.id}>
                <p className="font-medium mb-2">
                  {idx + 1}. {q.prompt}
                </p>
                <ul className="space-y-1 ml-4">
                  {q.options.map((o) => (
                    <li key={o.id} className="text-text-muted">
                      ◯ {o.label}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      )}

      <LessonComplete lessonId={lesson.id} />
    </div>
  );
}
