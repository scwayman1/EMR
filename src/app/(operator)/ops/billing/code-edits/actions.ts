"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { loadNcciCsv, loadMueCsv, quarterFromDate } from "@/lib/billing/ncci-mue";

// EMR-222 — manual refresh actions for the NCCI / MUE admin page.
// In production these are also invoked by a quarterly cron worker.

const NCCI_URL = process.env.CMS_NCCI_PTP_URL ?? "https://www.cms.gov/files/zip/ncci-ptp-edits.zip";
const MUE_URL = process.env.CMS_MUE_URL ?? "https://www.cms.gov/files/zip/mue.zip";

async function fetchCsvText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CMS fetch failed: ${res.status} ${res.statusText}`);
  return res.text();
}

export async function refreshNcciAction(): Promise<void> {
  const user = await requireUser();
  const csv = await fetchCsvText(NCCI_URL);
  await loadNcciCsv({
    csv,
    quarter: quarterFromDate(new Date()),
    source: NCCI_URL,
    loadedById: user.id,
  });
  revalidatePath("/ops/billing/code-edits");
}

export async function refreshMueAction(): Promise<void> {
  const user = await requireUser();
  const csv = await fetchCsvText(MUE_URL);
  await loadMueCsv({
    csv,
    quarter: quarterFromDate(new Date()),
    source: MUE_URL,
    loadedById: user.id,
  });
  revalidatePath("/ops/billing/code-edits");
}
