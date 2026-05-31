import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/permissions";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { listPendingLobbySubmissions } from "./actions";
import { SubmissionsList } from "./submissions-list";

// Force dynamic — this is a per-org review queue, never cached.
export const dynamic = "force-dynamic";

export default async function LobbySubmissionsPage() {
  const user = await getCurrentUser();
  const canReview = !!user && hasPermission(user, "patient.demographics.edit");
  const submissions = canReview ? await listPendingLobbySubmissions() : [];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Front desk"
        title="Lobby submissions"
        description="Intake and consent that patients completed on their phones from the kiosk hand-off. Review each — accepting adds it to the chart; nothing was written automatically."
      />
      {!canReview ? (
        <p className="text-[15px] text-text-muted">
          You don&rsquo;t have access to review lobby submissions.
        </p>
      ) : (
        <SubmissionsList initial={submissions} />
      )}
    </PageShell>
  );
}
