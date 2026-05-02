/**
 * EMR-063 — Pharmacy communication with dual sign-off
 *
 * Workflow center for clarification calls, refill auths, and prior
 * auth packets that need to leave the EMR for a pharmacy. Every
 * message that goes out the door requires two clinician signatures
 * before it transmits — provider plus a designated co-signer.
 *
 * The dual sign-off applies to controlled substances and to anything
 * tagged "high-risk" (anticoagulant changes, insulin, methotrexate,
 * etc). Routine refills can be single-signed but still flow through
 * this queue for tracking.
 */

import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricTile } from "@/components/ui/metric-tile";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Pharmacy" };

type PharmacyKind =
  | "refill_auth"
  | "clarification"
  | "prior_auth"
  | "discontinue"
  | "transfer";

interface PharmacyMessage {
  id: string;
  kind: PharmacyKind;
  patientName: string;
  pharmacyName: string;
  drug: string;
  summary: string;
  /** "draft" | "awaiting_cosign" | "ready_to_send" | "sent" | "acked" | "rejected" */
  status: "draft" | "awaiting_cosign" | "ready_to_send" | "sent" | "acked" | "rejected";
  /** Whether this transmission requires a second clinician's signature. */
  requiresCosign: boolean;
  primarySigner?: string;
  cosignSigner?: string;
  ageHours: number;
  controlled?: boolean;
}

const SAMPLE_MESSAGES: PharmacyMessage[] = [
  {
    id: "rx-001",
    kind: "refill_auth",
    patientName: "Williams, J.",
    pharmacyName: "CVS — Costa Mesa",
    drug: "Atorvastatin 40mg, 90 days",
    summary: "Annual refill, stable on dose, last lipid panel in range.",
    status: "ready_to_send",
    requiresCosign: false,
    primarySigner: "Dr. Patel",
    ageHours: 2,
  },
  {
    id: "rx-002",
    kind: "clarification",
    patientName: "Garcia, R.",
    pharmacyName: "Walgreens — Tustin",
    drug: "Warfarin 5mg",
    summary:
      "Pharmacy flagging dose discrepancy: chart says 5mg M/W/F, 7.5mg T/Th/Sa/Su. Confirm titration.",
    status: "awaiting_cosign",
    requiresCosign: true,
    primarySigner: "Dr. Patel",
    ageHours: 6,
  },
  {
    id: "rx-003",
    kind: "prior_auth",
    patientName: "Hassan, K.",
    pharmacyName: "Hoag Specialty",
    drug: "Adalimumab 40mg",
    summary: "PA packet to BCBS — failed methotrexate, rheum recommendation attached.",
    status: "awaiting_cosign",
    requiresCosign: true,
    primarySigner: "Dr. Patel",
    ageHours: 30,
  },
  {
    id: "rx-004",
    kind: "discontinue",
    patientName: "Nguyen, L.",
    pharmacyName: "CVS — Anaheim",
    drug: "Tramadol 50mg PRN",
    summary: "Discontinue — patient transitioned to cannabis-led pain plan.",
    status: "ready_to_send",
    requiresCosign: true,
    controlled: true,
    primarySigner: "Dr. Patel",
    cosignSigner: "Dr. Brennan",
    ageHours: 1,
  },
  {
    id: "rx-005",
    kind: "transfer",
    patientName: "Olafsson, B.",
    pharmacyName: "Costco — Tustin",
    drug: "Levothyroxine 75mcg",
    summary: "Transfer from Walgreens — patient request, no clinical change.",
    status: "sent",
    requiresCosign: false,
    primarySigner: "Dr. Patel",
    ageHours: 28,
  },
  {
    id: "rx-006",
    kind: "refill_auth",
    patientName: "Patel, A.",
    pharmacyName: "Mail-order Express Scripts",
    drug: "Lisinopril 20mg",
    summary: "90-day, stable.",
    status: "acked",
    requiresCosign: false,
    primarySigner: "Dr. Patel",
    ageHours: 72,
  },
  {
    id: "rx-007",
    kind: "clarification",
    patientName: "Rivera, M.",
    pharmacyName: "Walgreens — Irvine",
    drug: "Methotrexate 15mg weekly",
    summary:
      "Pharmacist verifying weekly (not daily) dosing — flagged automatically by their system.",
    status: "draft",
    requiresCosign: true,
    primarySigner: "Dr. Patel",
    ageHours: 0.5,
  },
];

export default async function PharmacyPage() {
  const user = await requireUser();
  if (!user.organizationId) {
    return (
      <PageShell>
        <div className="text-sm text-text-muted">No organization context.</div>
      </PageShell>
    );
  }

  const awaitingCosign = SAMPLE_MESSAGES.filter(
    (m) => m.status === "awaiting_cosign"
  );
  const readyToSend = SAMPLE_MESSAGES.filter((m) => m.status === "ready_to_send");
  const drafts = SAMPLE_MESSAGES.filter((m) => m.status === "draft");
  const inFlight = SAMPLE_MESSAGES.filter(
    (m) => m.status === "sent" || m.status === "acked"
  );

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Pharmacy"
        title="Pharmacy communications"
        description="Clarifications, refill auths, prior auths, transfers, and discontinue orders. Controlled substances and high-risk drugs require dual sign-off before they transmit."
        actions={
          <Link href="/clinic/pharmacy/new">
            <Button variant="primary" size="sm">
              New message
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetricTile
          label="Awaiting co-sign"
          value={awaitingCosign.length}
          accent={awaitingCosign.length > 0 ? "amber" : "none"}
          hint="Second signature required"
        />
        <MetricTile
          label="Ready to send"
          value={readyToSend.length}
          accent="forest"
          hint="Both signatures captured"
        />
        <MetricTile
          label="Drafts"
          value={drafts.length}
          accent="none"
          hint="Not yet signed"
        />
        <MetricTile
          label="In flight"
          value={inFlight.length}
          accent="forest"
          hint="Sent + acked by pharmacy"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card tone="raised">
          <CardHeader>
            <CardTitle className="text-base">Awaiting co-sign</CardTitle>
            <CardDescription>
              Controlled substances and high-risk drugs need a second clinician
              signature before they transmit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {awaitingCosign.length === 0 ? (
              <EmptyState
                title="Co-sign queue clear"
                description="Nothing waiting on a second signature."
              />
            ) : (
              awaitingCosign.map((m) => (
                <PharmacyRow key={m.id} message={m} highlight />
              ))
            )}
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardHeader>
            <CardTitle className="text-base">Ready to send</CardTitle>
            <CardDescription>
              Fully signed messages staged for transmission to the pharmacy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {readyToSend.length === 0 ? (
              <EmptyState
                title="Send queue clear"
                description="Sign messages from the awaiting-cosign queue to stage them here."
              />
            ) : (
              readyToSend.map((m) => <PharmacyRow key={m.id} message={m} />)
            )}
          </CardContent>
        </Card>
      </div>

      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>
            Sent and acknowledged messages from the last 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {inFlight.length === 0 ? (
            <EmptyState
              title="No recent activity"
              description="Sent messages will appear here once the pharmacy acknowledges them."
            />
          ) : (
            inFlight.map((m) => <PharmacyRow key={m.id} message={m} />)
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function PharmacyRow({
  message,
  highlight = false,
}: {
  message: PharmacyMessage;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "grid grid-cols-1 md:grid-cols-[1fr_180px_180px_140px] items-center gap-3 rounded-lg px-3 py-3 " +
        (highlight ? "bg-highlight-soft/40" : "hover:bg-surface-muted")
      }
    >
      <div className="min-w-0">
        <p className="text-sm text-text">
          {message.patientName}{" "}
          <span className="text-text-subtle">· {message.drug}</span>
        </p>
        <p className="text-[11px] text-text-subtle truncate">{message.summary}</p>
        <p className="text-[11px] text-text-subtle">
          → {message.pharmacyName}
          {message.controlled && (
            <Badge tone="danger" className="ml-2">
              CII–CV
            </Badge>
          )}
        </p>
      </div>
      <div className="space-y-1">
        <Badge tone={kindTone(message.kind)}>
          {kindLabel(message.kind)}
        </Badge>
        {message.requiresCosign && (
          <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle">
            Dual sign-off
          </p>
        )}
      </div>
      <SigState message={message} />
      <p className="text-xs text-text-subtle tabular-nums">
        {formatAge(message.ageHours)}
      </p>
    </div>
  );
}

function SigState({ message }: { message: PharmacyMessage }) {
  return (
    <div className="text-[11px] text-text-muted">
      <p>
        Primary:{" "}
        {message.primarySigner ? (
          <span className="text-text">{message.primarySigner} ✓</span>
        ) : (
          <span className="text-text-subtle">unsigned</span>
        )}
      </p>
      {message.requiresCosign && (
        <p>
          Co-sign:{" "}
          {message.cosignSigner ? (
            <span className="text-text">{message.cosignSigner} ✓</span>
          ) : (
            <span className="text-text-subtle">awaiting</span>
          )}
        </p>
      )}
    </div>
  );
}

function kindLabel(kind: PharmacyKind): string {
  switch (kind) {
    case "refill_auth":
      return "Refill auth";
    case "clarification":
      return "Clarification";
    case "prior_auth":
      return "Prior auth";
    case "discontinue":
      return "Discontinue";
    case "transfer":
      return "Transfer";
  }
}

function kindTone(
  kind: PharmacyKind
): "success" | "warning" | "danger" | "neutral" | "info" | "highlight" | "accent" {
  switch (kind) {
    case "discontinue":
      return "danger";
    case "prior_auth":
      return "highlight";
    case "clarification":
      return "warning";
    case "refill_auth":
      return "info";
    case "transfer":
      return "accent";
  }
}

function formatAge(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m ago`;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
