"use client";

import { useState } from "react";
import {
  Users,
  Sparkles,
  ShieldCheck,
  MessagesSquare,
  Bell,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/ornament";

type Pillar = {
  Icon: typeof Users;
  title: string;
  body: string;
};

const PILLARS: Pillar[] = [
  {
    Icon: MessagesSquare,
    title: "Cohort threads",
    body: "Patient-led groups by condition — chronic pain, sleep, anxiety, oncology — moderated by clinicians.",
  },
  {
    Icon: ShieldCheck,
    title: "Anonymous by default",
    body: "Share what's working without revealing your identity. HIPAA-aligned, no public profiles, ever.",
  },
  {
    Icon: Sparkles,
    title: "Linked to outcomes",
    body: "Posts can carry your real-world dosing context so others see the regimen behind the result.",
  },
];

export function CommunityTab() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero */}
      <div className="text-center mb-10 sm:mb-14">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-leaf-soft text-leaf shadow-sm ring-1 ring-border">
          <Users className="h-10 w-10" strokeWidth={1.75} />
        </div>
        <Eyebrow className="justify-center mb-4 text-leaf">
          Patient Forums — Coming Soon
        </Eyebrow>
        <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-text mb-4">
          A place to compare notes,{" "}
          <span className="text-leaf">privately.</span>
        </h2>
        <p className="text-base sm:text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
          We&apos;re building a moderated, anonymous community where patients
          share what&apos;s actually working — tied to the same outcomes data
          your clinician sees, never to your identity.
        </p>
      </div>

      {/* Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-12">
        {PILLARS.map(({ Icon, title, body }) => (
          <Card
            key={title}
            tone="raised"
            className="rounded-3xl bg-surface-muted/60 hover:bg-surface-muted transition-colors"
          >
            <CardContent className="p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-leaf-soft text-leaf">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="font-display text-lg text-text tracking-tight mb-1.5">
                {title}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">{body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notify capture */}
      <Card
        tone="raised"
        className="rounded-3xl border border-border bg-gradient-to-br from-leaf-soft via-surface-muted to-surface-muted overflow-hidden relative"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-leaf/15 blur-3xl"
        />
        <CardContent className="relative p-8 sm:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <h3 className="font-display text-2xl sm:text-3xl text-text tracking-tight mb-2">
                Be first in when we open the doors.
              </h3>
              <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-xl">
                Drop your email and we&apos;ll send one note when forums go
                live — no marketing fluff, no second message.
              </p>
            </div>

            {submitted ? (
              <div
                role="status"
                className="inline-flex items-center gap-2 rounded-full bg-leaf px-6 py-3 text-sm font-semibold text-white shadow-md"
              >
                <Check className="h-4 w-4" strokeWidth={3} />
                You&apos;re on the list
              </div>
            ) : (
              <form
                onSubmit={onSubmit}
                className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto"
              >
                <label htmlFor="forum-notify-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="forum-notify-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={cn(
                    "h-12 rounded-full border border-border bg-white/90 px-5 text-sm text-text",
                    "placeholder:text-text-muted/70 backdrop-blur",
                    "focus:outline-none focus:ring-2 focus:ring-leaf/40 focus:border-leaf/40",
                    "min-w-0 sm:min-w-[260px]"
                  )}
                />
                <button
                  type="submit"
                  className={cn(
                    "group inline-flex items-center justify-center gap-2",
                    "h-12 rounded-full px-6 text-sm font-semibold text-white",
                    "bg-leaf shadow-md transition-all",
                    "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                  )}
                >
                  <Bell className="h-4 w-4" strokeWidth={2.5} />
                  Notify me
                </button>
              </form>
            )}
          </div>

          <p className="text-[11px] text-text-muted/80 mt-5 leading-relaxed max-w-xl">
            We&apos;ll never share your address. Unsubscribe with one click in
            any email we send.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
