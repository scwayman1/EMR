import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/ornament";

export const metadata = { title: "ChatCB" };

export default async function ChatCBPage() {
  await requireRole("patient");

  return (
    <PageShell maxWidth="max-w-[860px]">
      <PageHeader
        eyebrow="Chat & Learn"
        title="ChatCB"
        description="A conversational cannabis search engine — ask anything, get cited evidence."
      />
      <PatientSectionNav section="chatLearn" />

      <Card tone="raised" className="mb-6">
        <CardContent className="py-10 text-center">
          <p className="text-5xl mb-4">🌿💬</p>
          <Eyebrow className="justify-center mb-3">Coming soon</Eyebrow>
          <h2 className="font-display text-xl text-text tracking-tight mb-2">
            ChatCB is in early access
          </h2>
          <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed mb-6">
            Built on the Medical Cannabis Library framework, ChatCB blends 11k+
            PubMed abstracts with our own outcome data so you can ask plain-language
            questions and get cited answers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/portal/learn">
              <Button variant="secondary">Browse research</Button>
            </Link>
            <Link href="/portal/combo-wheel">
              <Button>Try the Cannabis Wheel</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
