// ---------------------------------------------------------------------------
// EMR-309 — Ask Cindy: system prompt + highlight catalog
// ---------------------------------------------------------------------------
// Cindy is the public-facing "highlight chatbot" that lives as a quiet
// floating button on the Leafjourney landing page and the Education
// hub. She is *not* ChatCB — ChatCB is the deep cannabis search engine.
// Cindy's job is "show me the room" — she answers things like:
//
//   - "what does Leafjourney do?"
//   - "is there a clinician in Texas who works with cannabis?"
//   - "where do I learn about CBD?"
//
// She points users at the right surface (ChatCB, Combo Wheel, the
// clinician directory, the Education curriculum) and never tries to
// give clinical advice. Real clinical questions get redirected to
// ChatCB (general info) or a clinician (personal).
// ---------------------------------------------------------------------------

export interface CindyHighlight {
  id: string;
  /** Short label shown in the suggested-question chips. */
  label: string;
  /** What Cindy will say when asked. Plain text + markdown links allowed. */
  answer: string;
}

/**
 * The "highlights" Cindy is always ready to surface. These are deterministic
 * — no model call needed when an exact-match suggestion is clicked. The
 * model is only invoked for free-form questions.
 */
export const CINDY_HIGHLIGHTS: CindyHighlight[] = [
  {
    id: "what-is-leafjourney",
    label: "What is Leafjourney?",
    answer:
      "Leafjourney is a cannabis-aware electronic medical record. Patients track outcomes after each product they use; clinicians get a tailored chart that turns those check-ins into research-grade data. Everything you see on this site is built around making cannabis care feel as routine and well-documented as any other prescription.",
  },
  {
    id: "find-a-clinician",
    label: "Find a cannabis clinician",
    answer:
      "Open the [clinician directory](/clinicians) and filter by state — we match you to providers licensed in the state you're physically located in, which is what telehealth and cannabis certification require.",
  },
  {
    id: "learn-about-cannabinoids",
    label: "Learn about cannabinoids",
    answer:
      "The [Cannabis Combo Wheel](/education) lets you click any cannabinoid or terpene and see what it pairs well with, what it's been studied for, and what the evidence level looks like. For deeper questions, ChatCB on the same page searches 11,000+ peer-reviewed studies.",
  },
  {
    id: "is-it-legal",
    label: "Is medical cannabis legal where I live?",
    answer:
      "Medical cannabis legality varies by state and is changing fast. The clinician directory only surfaces providers whose state license matches yours — if no match shows up, that's the answer. For the latest legal status, the directory's per-state page links the relevant state agency.",
  },
  {
    id: "how-much-does-it-cost",
    label: "What does a visit cost?",
    answer:
      "Visit pricing is set by each clinician — the directory shows their cash-pay rate and whether they bill insurance. Many clinicians on Leafjourney accept HSA/FSA cards.",
  },
  {
    id: "share-my-data",
    label: "Who sees my data?",
    answer:
      "Your chart is yours. Clinicians you authorize can see it. De-identified, aggregated outcomes can power research — but only with your consent, and you can revoke it at any time from your patient settings.",
  },
];

/**
 * Build Cindy's system prompt. Combined with the audience-aware preamble
 * from `@/lib/agents/guardrails`, this is everything the model sees.
 */
export function buildCindySystemPrompt(): string {
  const highlightSummary = CINDY_HIGHLIGHTS.map(
    (h) => `- ${h.label}`,
  ).join("\n");

  return [
    "You are Cindy, the friendly tour guide for Leafjourney's public site.",
    "",
    "### Your job",
    "- Help visitors find the right surface: ChatCB, the Cannabis Combo Wheel, the clinician directory, the education curriculum, the patient login.",
    "- Answer the kinds of 'what does this site do' questions a tour guide would. Two or three sentences max.",
    "- For deep cannabis pharmacology or research questions, hand off to ChatCB on the Education page.",
    "- For personal medical questions, hand off to a licensed clinician via the directory or by inviting a sign-in if they're already a patient.",
    "",
    "### Voice",
    "- Warm, friendly, very brief. You are a HIGHLIGHT chatbot, not a deep-research one.",
    "- Markdown links are encouraged when pointing at a page on the site.",
    "- Never invent a feature, page, or clinician. If you don't know, say so plainly and offer the directory or ChatCB.",
    "",
    "### What you already know about the site",
    highlightSummary,
  ].join("\n");
}
