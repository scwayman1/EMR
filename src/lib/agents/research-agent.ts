import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

const input = z.object({
  queryId: z.string(),
  query: z.string(),
  patientId: z.string().optional(),
});

const output = z.object({
  summary: z.string(),
  citations: z.array(
    z.object({
      title: z.string(),
      source: z.string(),
      year: z.number().optional(),
      snippet: z.string(),
    })
  ),
});

// Tiny stub corpus. Replace with a real retrieval backend in Phase 4.
const STUB_CORPUS = [
  {
    title: "Cannabinoids for chronic pain — a systematic review",
    source: "Journal of Pain Research",
    year: 2021,
    tags: ["pain", "chronic", "neuropathic"],
    snippet: "Moderate evidence for cannabinoids in chronic neuropathic pain with number-needed-to-treat around 9.",
  },
  {
    title: "Cannabinoids and sleep disturbance",
    source: "Sleep Medicine Reviews",
    year: 2020,
    tags: ["sleep", "insomnia"],
    snippet: "Observational data suggests improved sleep onset with low-dose THC and balanced THC:CBD products.",
  },
  {
    title: "Nausea and appetite in oncology patients",
    source: "Supportive Care in Cancer",
    year: 2022,
    tags: ["nausea", "oncology", "appetite"],
    snippet: "Cannabinoids showed benefit over placebo in chemotherapy-induced nausea across multiple small RCTs.",
  },
  {
    title: "Anxiety and cannabidiol",
    source: "Neurotherapeutics",
    year: 2019,
    tags: ["anxiety", "cbd"],
    snippet: "CBD at moderate doses reduced acute anxiety in public-speaking paradigms.",
  },
];

/**
 * Research Synthesizer Agent
 * --------------------------
 * Retrieves evidence from the research corpus and writes a summary +
 * traceable citations. Read-only; no approval required.
 */
export const researchAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "researchSynthesizer",
  version: "1.0.0",
  description: "Retrieves and summarizes cannabis research evidence.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.research", "read.patient"],
  requiresApproval: false,

  async run({ queryId, query }, ctx) {
    ctx.assertCan("read.research");

    const tokens = query.toLowerCase().split(/\s+/);
    const hits = STUB_CORPUS.filter((p) => p.tags.some((t) => tokens.includes(t))).slice(0, 4);

    const citations = hits.map((p) => ({
      title: p.title,
      source: p.source,
      year: p.year,
      snippet: p.snippet,
    }));

    const summary =
      hits.length > 0
        ? `Found ${hits.length} relevant studies. ${hits.map((h) => h.snippet).join(" ")}`
        : `No matching studies in the indexed corpus for "${query}". Consider broadening the query.`;

    // Persist the results on the saved query so the UI can render them.
    await prisma.researchResult.deleteMany({ where: { queryId } });
    await prisma.researchResult.createMany({
      data: citations.map((c, idx) => ({
        queryId,
        title: c.title,
        source: c.source,
        year: c.year ?? null,
        summary: c.snippet,
        citation: `${c.source}${c.year ? ` (${c.year})` : ""}`,
        rank: idx,
      })),
    });

    await writeAgentAudit(
      "researchSynthesizer",
      "1.0.0",
      null,
      "research.query.answered",
      { type: "ResearchQuery", id: queryId },
      { hitCount: hits.length }
    );

    ctx.log("info", "Research query answered", { hitCount: hits.length });

    return { summary, citations };
  },
};
