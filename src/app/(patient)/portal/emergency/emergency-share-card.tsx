"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PatientSummary {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  allergies: string[];
  contraindications: string[];
}

interface Props {
  shareUrl: string;
  patient: PatientSummary;
}

// Renders the printable emergency card with a QR. We render the QR via the
// long-running, no-auth qrserver.com endpoint. If a paramedic is offline they
// can still tap the URL printed beneath the QR.
//
// The QR encodes the full /share/<token> URL. Tokens are HMAC-signed and
// expire after 72 hours (see src/lib/auth/share-tokens.ts).
function qrSrc(url: string, size = 240): string {
  const encoded = encodeURIComponent(url);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=2&data=${encoded}`;
}

function formatDob(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function EmergencyShareCard({ shareUrl, patient }: Props) {
  const [copied, setCopied] = useState(false);

  function copyUrl() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <Card tone="raised" className="overflow-hidden print:shadow-none print:border print:border-text">
      <CardContent className="py-6 md:py-8">
        <div className="grid gap-6 md:grid-cols-[240px,1fr] items-start">
          {/* QR */}
          <div className="flex flex-col items-center">
            <img
              src={qrSrc(shareUrl)}
              alt="Scan with any phone camera to view this patient's read-only summary"
              width={240}
              height={240}
              className="rounded-lg border border-border bg-white p-2"
            />
            <Badge tone="info" className="mt-3 text-[10px]">
              72-hour link · refreshes on visit
            </Badge>
          </div>

          {/* Identity + safety summary */}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-text-subtle">
              Leafjourney emergency card
            </p>
            <h2 className="font-display text-2xl text-text tracking-tight mt-1">
              {patient.firstName} {patient.lastName}
            </h2>
            <p className="text-sm text-text-muted mt-1">
              DOB {formatDob(patient.dateOfBirth)}
            </p>

            {patient.allergies.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-danger mb-1">
                  Allergies
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies.map((a) => (
                    <Badge key={a} tone="danger" className="text-[11px]">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {patient.contraindications.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle mb-1">
                  Contraindications
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {patient.contraindications.map((c) => (
                    <Badge key={c} tone="warning" className="text-[11px]">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 rounded-lg border border-border bg-surface-muted/60 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-text-subtle">
                Medical record link
              </p>
              <p className="font-mono text-xs text-text break-all mt-1">
                {shareUrl}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-2 print:hidden">
              <Button size="sm" variant="secondary" onClick={copyUrl}>
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.print()}
              >
                Print card
              </Button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline"
              >
                Preview what they see
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
