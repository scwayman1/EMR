"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { resolveDeadLetter } from "@/lib/billing/clearinghouse/dead-letter";

export async function resolveAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "");
  if (!id) return;
  await resolveDeadLetter({ id, resolvedById: user.id, resolutionNote: note || "(no note)" });
  revalidatePath("/ops/billing/dead-letter");
}
