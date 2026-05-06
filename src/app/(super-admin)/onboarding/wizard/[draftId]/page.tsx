// Wizard page — the host route for a single in-progress practice
// configuration draft. Server component: gates on
// `requireImplementationAdmin`, loads the draft from the DB, and hands an
// initial snapshot to the `<WizardShell>` client component.
//
// The shell handles all interactivity (rail, step pane, autosave) so we
// avoid `useEffect`-based fetching on the client side.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { WizardShell } from "./wizard-shell";
import {
  loadDraftConfiguration,
  requireImplementationAdminCompat,
} from "./loaders";

export const metadata: Metadata = {
  title: "Onboarding wizard - Leafjourney",
};

export default async function WizardPage({
  params,
}: {
  params: { draftId: string };
}) {
  // EMR-428 owns the canonical implementation. Until it lands we use a
  // compatibility shim that delegates to the existing auth/session layer
  // and rejects non-superuser sessions.
  await requireImplementationAdminCompat();

  const draft = await loadDraftConfiguration(params.draftId);
  if (!draft) notFound();

  return <WizardShell draftId={params.draftId} initialDraft={draft} />;
}
