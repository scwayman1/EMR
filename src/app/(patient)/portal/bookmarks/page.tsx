import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { BookmarksView } from "./bookmarks-view";

export const metadata = { title: "Bookmarks" };

export default async function BookmarksPage() {
  await requireRole("patient");

  return (
    <PageShell maxWidth="max-w-[880px]">
      <PageHeader
        eyebrow="Saved for later"
        title="Your bookmarks"
        description="Products, notes, tips, and articles you've saved across the portal. Everything is stored on this device."
      />
      <PatientSectionNav section="account" />
      <BookmarksView />
    </PageShell>
  );
}
