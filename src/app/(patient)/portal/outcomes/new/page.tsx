import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/ornament";
import { OutcomeForm } from "./outcome-form";

export const metadata = { title: "Log a check-in" };

export default async function NewOutcomePage() {
  await requireRole("patient");

  return (
    <PageShell maxWidth="max-w-[720px]">
      {/* Ambient hero message */}
      <Card tone="ambient" className="mb-8">
        <CardContent className="py-8 px-8">
          <Eyebrow className="mb-3">Daily check-in</Eyebrow>
          <h2 className="font-display text-2xl md:text-3xl text-text tracking-tight leading-tight">
            A minute of reflection<br />
            goes a long way.
          </h2>
          <p className="text-sm text-text-muted mt-3 max-w-md leading-relaxed">
            Rate each area on a 0-10 scale. Your care team uses these trends
            to adjust your plan -- honest answers help more than perfect ones.
          </p>
        </CardContent>
      </Card>

      <OutcomeForm />
    </PageShell>
  );
}
