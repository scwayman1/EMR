import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { DEFAULT_FLAGS } from "@/lib/domain/overnight-batch";
import { FlagsView } from "./flags-view";

export const metadata = { title: "Feature Flags" };

export default async function FeatureFlagsPage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <PageHeader
        eyebrow="Admin"
        title="Feature flags"
        description="Enable or disable platform features. Experimental flags are behind a stronger warning — flip carefully."
      />
      <FlagsView initialFlags={DEFAULT_FLAGS} />
    </PageShell>
  );
}
