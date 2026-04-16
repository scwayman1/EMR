"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldGroup } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

interface Patient {
  id: string;
  name: string;
  phone: string | null;
}

interface SentMessage {
  id: string;
  to: string;
  patientName: string;
  body: string;
  sentAt: string;
  status: "delivered" | "queued" | "failed";
}

type TemplateKey = "blank" | "reminder" | "refill" | "labs" | "checkin";

const TEMPLATES: Record<TemplateKey, { label: string; body: string }> = {
  blank: { label: "— Blank message —", body: "" },
  reminder: {
    label: "Appointment reminder",
    body: "Hi {{firstName}}, this is a friendly reminder of your appointment tomorrow. Reply Y to confirm or call us to reschedule. — Leafjourney",
  },
  refill: {
    label: "Refill ready",
    body: "Hi {{firstName}}, your refill is ready for pickup at your dispensary. Questions? Log in to your portal. — Leafjourney",
  },
  labs: {
    label: "Lab results available",
    body: "Hi {{firstName}}, your lab results are available in your patient portal. Your provider will follow up if anything needs attention. — Leafjourney",
  },
  checkin: {
    label: "Check-in nudge",
    body: "Hi {{firstName}}, how are you feeling this week? Tap to log a quick check-in: leafj.co/c — Leafjourney",
  },
};

const DEMO_SENT: SentMessage[] = [
  {
    id: "s1",
    to: "+1 (415) 555-0142",
    patientName: "Jordan Ellis",
    body: "Hi Jordan, your refill is ready for pickup…",
    sentAt: "2026-04-16 10:42",
    status: "delivered",
  },
  {
    id: "s2",
    to: "+1 (415) 555-0199",
    patientName: "Priya Shah",
    body: "Hi Priya, this is a friendly reminder…",
    sentAt: "2026-04-16 09:10",
    status: "delivered",
  },
  {
    id: "s3",
    to: "+1 (628) 555-0108",
    patientName: "Marcus Cole",
    body: "Hi Marcus, how are you feeling this week?…",
    sentAt: "2026-04-15 16:22",
    status: "queued",
  },
];

export function SmsView({ patients }: { patients: Patient[] }) {
  const [patientId, setPatientId] = useState<string>(patients[0]?.id ?? "");
  const [template, setTemplate] = useState<TemplateKey>("blank");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState<SentMessage[]>(DEMO_SENT);
  const [confirm, setConfirm] = useState(false);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === patientId) ?? null,
    [patients, patientId]
  );

  const resolvedBody = useMemo(() => {
    const firstName = selectedPatient?.name?.split(" ")[0] ?? "there";
    return body.replace(/\{\{firstName\}\}/g, firstName);
  }, [body, selectedPatient]);

  const charCount = resolvedBody.length;
  const overLimit = charCount > 160;

  const applyTemplate = (key: TemplateKey) => {
    setTemplate(key);
    setBody(TEMPLATES[key].body);
  };

  const handleSend = () => {
    if (!selectedPatient || !body.trim()) return;
    const newMsg: SentMessage = {
      id: `s-${Date.now()}`,
      to: selectedPatient.phone ?? "+1 (555) 555-0000",
      patientName: selectedPatient.name,
      body: resolvedBody,
      sentAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      status: "queued",
    };
    setSent([newMsg, ...sent]);
    setConfirm(true);
    setBody("");
    setTemplate("blank");
    setTimeout(() => setConfirm(false), 2500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      <div className="space-y-6">
        <Card tone="raised">
          <CardHeader>
            <CardTitle>Compose</CardTitle>
            <CardDescription>
              SMS is sent via a HIPAA-safe aggregator. Do not include PHI like diagnoses or med names.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup label="To (patient)" htmlFor="patient">
              <select
                id="patient"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text"
              >
                {patients.length === 0 && <option value="">No patients available</option>}
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.phone ? `— ${p.phone}` : "(no phone)"}
                  </option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup label="Template" htmlFor="template">
              <select
                id="template"
                value={template}
                onChange={(e) => applyTemplate(e.target.value as TemplateKey)}
                className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text"
              >
                {(Object.keys(TEMPLATES) as TemplateKey[]).map((k) => (
                  <option key={k} value={k}>
                    {TEMPLATES[k].label}
                  </option>
                ))}
              </select>
            </FieldGroup>

            <FieldGroup
              label="Message"
              htmlFor="body"
              hint="Use {{firstName}} for auto-substitution."
            >
              <Textarea
                id="body"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message…"
              />
            </FieldGroup>

            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-xs",
                  overLimit ? "text-danger font-medium" : "text-text-muted"
                )}
              >
                {charCount} / 160 {overLimit && "— will split into multiple messages"}
              </span>
              <Button
                onClick={handleSend}
                disabled={!selectedPatient || !body.trim()}
              >
                Send SMS
              </Button>
            </div>

            {confirm && (
              <div className="rounded-md border border-accent/30 bg-accent-soft text-accent p-3 text-sm">
                Message queued for delivery (demo — nothing was actually sent).
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sent messages</CardTitle>
            <CardDescription>Latest outbound SMS activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {sent.map((m) => (
                <div key={m.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text">{m.patientName}</span>
                      <span className="text-xs text-text-subtle">{m.to}</span>
                    </div>
                    <div className="text-sm text-text-muted mt-0.5 truncate">{m.body}</div>
                    <div className="text-xs text-text-subtle mt-0.5">{m.sentAt}</div>
                  </div>
                  <Badge
                    tone={
                      m.status === "delivered"
                        ? "success"
                        : m.status === "queued"
                        ? "info"
                        : "danger"
                    }
                  >
                    {m.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <aside>
        <Card tone="ambient" className="sticky top-6">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>How it looks on iPhone</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mx-auto max-w-[280px] rounded-[28px] border-4 border-neutral-800 bg-neutral-900 p-3 shadow-xl">
              <div className="rounded-[18px] bg-neutral-50 min-h-[360px] p-3 flex flex-col">
                <div className="text-center text-[11px] text-neutral-500 pb-2 border-b border-neutral-200">
                  {selectedPatient?.name ?? "Patient"} — Text Message
                </div>
                <div className="flex-1 pt-3 flex flex-col gap-2">
                  {resolvedBody ? (
                    <div className="self-start max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-sm bg-neutral-200 text-neutral-900 text-[13px] leading-snug">
                      {resolvedBody}
                    </div>
                  ) : (
                    <div className="text-center text-xs text-neutral-400 mt-12">
                      Your message will appear here
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
