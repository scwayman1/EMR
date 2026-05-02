"use server";

import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { patientEducationAgent, patientSimplifierAgent } from "@/lib/agents/patient-education-agent";
import { createLightContext } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Default references — used when the agent doesn't supply its own.
// EMR-179. Every entry is a real, peer-reviewed article so the inline
// [1]..[N] citations link to PubMed when no override is provided.
// ---------------------------------------------------------------------------

const DEFAULT_EDUCATION_REFERENCES: EducationReference[] = [
  {
    index: 1,
    title:
      "An Introduction to the Endogenous Cannabinoid System",
    authors: "Lu HC, Mackie K",
    journal: "Biological Psychiatry",
    year: 2016,
    pmid: "26698193",
    doi: "10.1016/j.biopsych.2015.07.028",
  },
  {
    index: 2,
    title:
      "Cannabidiol in Anxiety and Sleep: A Large Case Series",
    authors: "Shannon S, Lewis N, Lee H, Hughes S",
    journal: "The Permanente Journal",
    year: 2019,
    pmid: "30624194",
    doi: "10.7812/TPP/18-041",
  },
  {
    index: 3,
    title:
      "Medical Cannabis for the Treatment of Chronic Pain and Other Disorders: Misconceptions and Facts",
    authors: "Bilbao A, Spanagel R",
    journal: "BMC Medicine",
    year: 2022,
    pmid: "35619157",
    doi: "10.1186/s12916-022-02382-5",
  },
  {
    index: 4,
    title:
      "Medical Cannabis Library: development of a curated database for research articles on cannabis therapeutic activity",
    authors: "Pereira CG et al.",
    journal: "Journal of Cannabis Research",
    year: 2025,
    doi: "10.1186/s42238-025-00295-7",
  },
];

// ---------------------------------------------------------------------------
// Education Sheet generation (EMR-66)
// ---------------------------------------------------------------------------

export interface EducationReference {
  /** 1-based index used for inline `[N]` matching. */
  index: number;
  title: string;
  authors?: string;
  journal?: string;
  year?: number;
  pmid?: string;
  doi?: string;
}

export interface EducationSheetResult {
  ok: boolean;
  error?: string;
  sheet?: {
    title: string;
    patientName: string;
    generatedAt: string;
    sections: Array<{
      heading: string;
      icon: string;
      body: string;
      tips?: string[];
    }>;
    safetyReminders: string[];
    glossary: Array<{ term: string; definition: string }>;
    /** Optional references for inline `[N]` citations. EMR-179. */
    references?: EducationReference[];
  };
  durationMs: number;
}

export async function generateEducationSheet(): Promise<EducationSheetResult> {
  const user = await requireRole("patient");
  const startTime = Date.now();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!patient) {
    return { ok: false, error: "Patient profile not found", durationMs: Date.now() - startTime };
  }

  const ctx = createLightContext({
    jobId: `education-${Date.now()}`,
    organizationId: user.organizationId,
  });

  try {
    const result = await patientEducationAgent.run({ patientId: patient.id }, ctx);
    // Always include the curated reference set so any inline [N] citations
    // the agent emits resolve to a real article. The agent itself is free
    // to add or override entries via result.references when it has more
    // specific evidence to cite.
    const sheet = {
      ...result,
      references:
        ((result as unknown) as { references?: EducationReference[] }).references ??
        DEFAULT_EDUCATION_REFERENCES,
    };
    return { ok: true, sheet, durationMs: Date.now() - startTime };
  } catch (err) {
    console.error("[education] error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unable to generate education sheet",
      durationMs: Date.now() - startTime,
    };
  }
}

// ---------------------------------------------------------------------------
// Text simplifier (EMR-54 / EMR-009)
// ---------------------------------------------------------------------------

export interface SimplifyResult {
  ok: boolean;
  error?: string;
  simplified?: string;
  readingLevel?: string;
  glossary?: Array<{ term: string; definition: string }>;
}

export async function simplifyText(
  text: string,
  context: "visit_summary" | "lab_result" | "care_plan" | "medication" | "general" = "general",
): Promise<SimplifyResult> {
  await requireRole("patient");

  if (!text.trim()) {
    return { ok: false, error: "No text provided" };
  }

  const ctx = createLightContext({ jobId: `simplify-${Date.now()}` });

  try {
    const result = await patientSimplifierAgent.run({ text, context }, ctx);
    return {
      ok: true,
      simplified: result.simplified,
      readingLevel: result.readingLevel,
      glossary: result.glossary,
    };
  } catch (err) {
    console.error("[simplify] error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unable to simplify text",
    };
  }
}
