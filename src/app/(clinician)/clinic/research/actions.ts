"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { dispatch } from "@/lib/orchestration/dispatch";
import { runTick } from "@/lib/orchestration/runner";

const schema = z.object({ query: z.string().min(2).max(240) });

export type ResearchResult = { ok: true; queryId: string } | { ok: false; error: string };

export async function runResearchQuery(
  _prev: ResearchResult | null,
  formData: FormData
): Promise<ResearchResult> {
  const user = await requireUser();
  const parsed = schema.safeParse({ query: formData.get("query") });
  if (!parsed.success) return { ok: false, error: "Please enter a longer query." };

  const query = await prisma.researchQuery.create({
    data: { userId: user.id, queryText: parsed.data.query },
  });

  await dispatch({
    name: "research.query.submitted",
    queryId: query.id,
    query: parsed.data.query,
  });

  // In dev, drive the queue inline so results are immediately visible.
  if (process.env.NODE_ENV !== "production") {
    await runTick("inline-dev", 2);
  }

  revalidatePath("/clinic/research");
  return { ok: true, queryId: query.id };
}
