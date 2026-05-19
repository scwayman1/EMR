import Link from "next/link";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Organization Required" };

export default function NoOrgPage() {
  return (
    <PageShell maxWidth="max-w-[800px]">
      <PageHeader eyebrow="Access Denied" title="Organization Required" />
      <EmptyState
        title="No Organization Assigned"
        description="You do not have an active organization assignment. If you are a Super Admin, please use the 'View as practice' feature from the Admin Dashboard to impersonate a clinic. If you are a provider, contact support to be added to a clinic."
        action={
          <div className="flex gap-4">
            <Button asChild variant="primary">
              <Link href="/admin/hq">Go to Admin Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/sign-in">Sign in as different user</Link>
            </Button>
          </div>
        }
      />
    </PageShell>
  );
}
