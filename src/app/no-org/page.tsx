import Link from "next/link";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";

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
            <Link
              href="/admin/hq"
              className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent/90 transition-colors"
            >
              Go to Admin Dashboard
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-md border border-border-strong bg-surface-raised px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted transition-colors"
            >
              Sign in as different user
            </Link>
          </div>
        }
      />
    </PageShell>
  );
}
