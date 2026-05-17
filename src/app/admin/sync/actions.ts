"use server";

import { syncLeaflyCatalog } from "@/lib/integrations/sync-service";
import { requireRole } from "@/lib/auth/session";

export async function triggerManualSyncAction() {
  await requireRole("admin"); // Assumes admin role requirement
  try {
    const result = await syncLeaflyCatalog();
    return { ok: true, message: `Successfully synced ${result.syncedCount} strains.` };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
