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
              <Button className="gap-2">
                <span
                  aria-hidden="true"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-white/40 shadow-[0_0_0_1px_rgba(255,255,255,0.15)]"
                  style={{
                    background:
                      "conic-gradient(from 0deg, #2D8B5E, #4FA77B, #E8A838, #B86896, #6B4F8B, #1F8AB6, #2D8B5E)",
                  }}
                >
                  <span className="block h-1 w-1 rounded-full bg-white" />
                </span>
                Try the Cannabis Wheel
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
