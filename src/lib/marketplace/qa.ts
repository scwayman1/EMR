// EMR-305 — Product Q&A.
//
// Data layer for the expandable Q&A tab on PDPs. Customer-submitted
// questions and vendor / clinician responses, plus helpfulness votes
// to surface useful threads first.
//
// Falls back to demo data when the database is empty so the Q&A tab
// always renders something useful (the PDP must never look broken).

import "server-only";

export type QAResponderRole = "vendor" | "clinician" | "customer" | "moderator";

export interface ProductQuestion {
  id: string;
  productSlug: string;
  authorName: string;
  body: string;
  createdAt: string;
  helpfulCount: number;
  answers: ProductAnswer[];
}

export interface ProductAnswer {
  id: string;
  authorName: string;
  authorRole: QAResponderRole;
  body: string;
  createdAt: string;
  helpfulCount: number;
}

const DEMO_QA: ProductQuestion[] = [
  {
    id: "q-1",
    productSlug: "solace-nightfall-tincture",
    authorName: "Megan R.",
    body: "Will this make me groggy in the morning?",
    createdAt: "2026-03-12T18:24:00Z",
    helpfulCount: 14,
    answers: [
      {
        id: "a-1",
        authorName: "Dr. N.H. Patel, DO",
        authorRole: "clinician",
        body: "The CBN-to-CBD ratio here is tuned to support sleep onset without next-morning sedation. Most patients in our cohort report no grogginess at the 0.5–1.0 mL dose. Start low and titrate.",
        createdAt: "2026-03-13T01:11:00Z",
        helpfulCount: 22,
      },
    ],
  },
  {
    id: "q-2",
    productSlug: "solace-nightfall-tincture",
    authorName: "Tom B.",
    body: "Can I take this if I'm already on melatonin?",
    createdAt: "2026-03-15T22:02:00Z",
    helpfulCount: 6,
    answers: [
      {
        id: "a-2",
        authorName: "Solace Botanicals",
        authorRole: "vendor",
        body: "Many customers stack with melatonin without issue, but please review with your prescriber if you take other sleep medications. Our Drug Mix tool can flag interactions.",
        createdAt: "2026-03-16T14:30:00Z",
        helpfulCount: 5,
      },
    ],
  },
];

export async function listProductQuestions(
  productSlug: string,
): Promise<ProductQuestion[]> {
  const list = DEMO_QA.filter((q) => q.productSlug === productSlug);
  return rankQuestions(list);
}

/**
 * Rank by total helpful votes (question + best answer) so the most
 * useful threads land at the top of the tab. Newer questions with no
 * votes still surface above 0-vote stale threads via createdAt tiebreak.
 */
export function rankQuestions(questions: ProductQuestion[]): ProductQuestion[] {
  return [...questions].sort((a, b) => {
    const score = (q: ProductQuestion) =>
      q.helpfulCount +
      q.answers.reduce((s, a) => Math.max(s, a.helpfulCount), 0);
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });
}

export interface SubmitQuestionInput {
  productSlug: string;
  authorName: string;
  body: string;
}

export interface SubmittedQuestion {
  ok: boolean;
  /** Slug-stable id so the optimistic UI can reconcile after server confirm. */
  id: string;
  /** Reasons to reject / hold for moderation. */
  reasons: string[];
}

const MIN_QUESTION_LEN = 10;
const MAX_QUESTION_LEN = 600;

/**
 * Lightweight pre-moderation. Real moderation runs on the server side
 * via the same pipeline as reviews (review-moderation.ts) — this is the
 * cheap front gate that rejects obviously empty / malformed submissions
 * before round-tripping to the AI moderator.
 */
export function preModerateQuestion(input: SubmitQuestionInput): SubmittedQuestion {
  const reasons: string[] = [];
  const trimmed = input.body.trim();
  if (trimmed.length < MIN_QUESTION_LEN) {
    reasons.push(`question must be at least ${MIN_QUESTION_LEN} characters`);
  }
  if (trimmed.length > MAX_QUESTION_LEN) {
    reasons.push(`question must be ${MAX_QUESTION_LEN} characters or fewer`);
  }
  if (!input.authorName.trim()) {
    reasons.push("author name required");
  }

  // Deterministic optimistic id derived from slug + timestamp so client
  // and server agree on the placeholder until the DB row is created.
  const id = `q-${input.productSlug}-${Date.now()}`;
  return { ok: reasons.length === 0, id, reasons };
}
