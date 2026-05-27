import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { generateShareToken } from "@/lib/auth/share-tokens";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { EmergencyShareCard } from "./emergency-share-card";

export const metadata = { title: "Emergency Card" };

// Patient Emergency Access — EMR-144 / EMR-149
//
// Generates a fresh signed share token (72-hour TTL) and renders:
//   - a printable QR card a paramedic / ER team can scan
//   - the raw URL so it can be copied or texted
//   - guidance for adding the link to Apple Wallet or an NFC tag
// Tokens are rotated every page load so leaks are short-lived.

export default async function EmergencyPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      allergies: true,
      contraindications: true,
    },
  });
  if (!patient) redirect("/portal/intake");

  const token = generateShareToken(patient.id);
  const host = headers().get("host") ?? "leafjourney.com";
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  const shareUrl = `${proto}://${host}/share/${token}`;

  return (
    <PageShell maxWidth="max-w-[860px]">
      <PatientSectionNav section="account" />
      <PageHeader
        eyebrow="Emergency"
        title="Your emergency card"
        description="A read-only summary anyone can pull up by scanning a code. Updates the moment your chart does."
      />

      <EmergencyShareCard
        shareUrl={shareUrl}
        patient={{
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString() : null,
          allergies: patient.allergies,
          contraindications: patient.contraindications,
        }}
      />

      <EditorialRule className="my-10" />

      {/* Carrier options */}
      <section className="mb-8">
        <Eyebrow className="mb-4">Carry it with you</Eyebrow>
        <div className="grid gap-4 md:grid-cols-3">
          <CarrierCard
            emoji="\u{1F4F1}"
            title="Apple Wallet"
            body="On iPhone, open the share link, tap the share icon, and choose Add to Wallet. Your card stays on the lock screen."
          />
          <CarrierCard
            emoji="\u{1F4F6}"
            title="NFC tag or sticker"
            body="Program any blank NFC tag with the link below using the iPhone Shortcuts app or NFC Tools on Android. Tap to open in any browser."
          />
          <CarrierCard
            emoji="\u{1F5A8}\u{FE0F}"
            title="Print and laminate"
            body="The QR card above is sized for a wallet. Print, fold, laminate. The link refreshes every visit so an old print stays valid up to 72 hours."
          />
        </div>
      </section>

      <Card tone="ambient">
        <CardContent className="py-5 text-sm text-text-muted leading-relaxed">
          <p>
            <span className="font-medium text-text">A note on safety:</span>{" "}
            anyone who scans the code can see your allergies, current
            medications, and cannabis regimen. Do not post the QR publicly. The
            link expires after 72 hours; visit this page again to generate a
            fresh one.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function CarrierCard({
  emoji,
  title,
  body,
}: {
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <Card tone="raised">
      <CardContent className="py-5">
        <span className="text-3xl block mb-3" aria-hidden="true">
          {emoji}
        </span>
        <p className="font-medium text-text mb-1.5">{title}</p>
        <p className="text-sm text-text-muted leading-relaxed">{body}</p>
        <Badge tone="neutral" className="mt-3 text-[10px]">
          Updates with your chart
        </Badge>
      </CardContent>
    </Card>
  );
}
