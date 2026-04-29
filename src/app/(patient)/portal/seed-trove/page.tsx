import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { lex } from "@/lib/lexicon";
import {
  buildDemoSnapshot,
  buildDemoGiftCards,
} from "@/lib/domain/seed-trove-demo";
import { TroveWalletView } from "./wallet-view";

export const metadata = { title: "Seed Trove" };

export default async function SeedTrovePage() {
  const user = await requireRole("patient");
  const snapshot = buildDemoSnapshot(user.id);
  const giftCards = buildDemoGiftCards(user.id);

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow={lex("trove.name")}
        title={`Your ${lex("trove.name")}`}
        description={lex("trove.tagline")}
      />
      <TroveWalletView snapshot={snapshot} giftCards={giftCards} />
    </PageShell>
  );
}
