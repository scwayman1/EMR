"use client";

// EMR-312 — "Mark complete" client component. Calls the server action
// and shows a confirmation. CME credit accrual is decided server-side.

import { useState, useTransition } from "react";
import { recordLessonCompleted } from "../../actions";

const DEMO_LEARNER_ID = "demo-clinician";

export function LessonComplete({ lessonId }: { lessonId: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function onClick() {
    startTransition(async () => {
      // For lessons with an assessment, the player would pass the actual
      // score. V1 hard-codes a passing score so the credit pipeline can
      // be exercised end-to-end.
      await recordLessonCompleted(DEMO_LEARNER_ID, lessonId, 1.0);
      setDone(true);
    });
  }

  if (done) {
    return (
      <p className="text-sm text-accent font-semibold">
        ✓ Marked complete. CME credit recorded.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="px-5 py-2.5 rounded-full bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-50 transition-all"
    >
      {pending ? "Saving…" : "Mark lesson complete"}
    </button>
  );
}
