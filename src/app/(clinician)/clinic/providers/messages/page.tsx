"use client";

import { useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { Eyebrow, LeafSprig, EditorialRule } from "@/components/ui/ornament";

// ---------------------------------------------------------------------------
// Demo provider list (in production, fetched from server)
// ---------------------------------------------------------------------------

interface DemoMessage {
  id: string;
  from: string;
  fromInitials: string;
  body: string;
  timestamp: string;
  isOwn: boolean;
}

interface DemoThread {
  id: string;
  providerName: string;
  providerInitials: string;
  providerTitle: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
  messages: DemoMessage[];
}

const DEMO_THREADS: DemoThread[] = [
  {
    id: "t1",
    providerName: "Dr. Neal Patel",
    providerInitials: "NP",
    providerTitle: "CMO, Cannabis Medicine",
    lastMessage:
      "Just reviewed Maya Reyes' latest labs. The CBD seems to be working well for her anxiety — can we discuss adjusting the THC component at our next meeting?",
    lastMessageAt: "2 hours ago",
    unread: true,
    messages: [
      {
        id: "m1",
        from: "Dr. Neal Patel",
        fromInitials: "NP",
        body: "Just reviewed Maya Reyes' latest labs. The CBD seems to be working well for her anxiety — can we discuss adjusting the THC component at our next meeting?",
        timestamp: "Today at 2:15 PM",
        isOwn: false,
      },
      {
        id: "m2",
        from: "You",
        fromInitials: "YO",
        body: "Absolutely. I noticed her sleep scores improving too. Let's consider a 1:1 THC:CBD ratio at a lower total mg. Want to review together Thursday?",
        timestamp: "Today at 2:22 PM",
        isOwn: true,
      },
      {
        id: "m3",
        from: "Dr. Neal Patel",
        fromInitials: "NP",
        body: "Thursday works. I'll pull her outcome trends and the latest research on 1:1 ratios for GAD. See you then.",
        timestamp: "Today at 2:30 PM",
        isOwn: false,
      },
    ],
  },
  {
    id: "t2",
    providerName: "Justin Kander",
    providerInitials: "JK",
    providerTitle: "Research Director",
    lastMessage:
      "New study just published on CBG for anxiety — single 20mg dose showed significant reduction. Adding to the corpus now.",
    lastMessageAt: "Yesterday",
    unread: false,
    messages: [
      {
        id: "m4",
        from: "Justin Kander",
        fromInitials: "JK",
        body: "New study just published on CBG for anxiety — single 20mg dose showed significant reduction. Adding to the corpus now.",
        timestamp: "Yesterday at 4:45 PM",
        isOwn: false,
      },
      {
        id: "m5",
        from: "You",
        fromInitials: "YO",
        body: "Excellent find. Should we update the dosing guidelines in the library? Also wondering if we should flag this for James Chen's case — he's been anxious about the higher THC doses.",
        timestamp: "Yesterday at 5:10 PM",
        isOwn: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProviderMessagesPage() {
  const [activeThreadId, setActiveThreadId] = useState<string>(
    DEMO_THREADS[0].id,
  );
  const [draft, setDraft] = useState("");

  const activeThread = DEMO_THREADS.find((t) => t.id === activeThreadId)!;

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Eyebrow className="mb-2">Secure provider channel</Eyebrow>
          <h1 className="font-display text-2xl text-text tracking-tight">
            Provider-to-Provider Messaging
          </h1>
          <p className="text-sm text-text-muted mt-1">
            HIPAA-compliant internal communication between providers about patient care.
          </p>
        </div>
        <Link href="/clinic/providers">
          <Button variant="secondary" size="sm">
            Provider directory
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-6 min-h-[600px]">
        {/* Thread list */}
        <div className="col-span-4">
          <Card tone="raised" className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <LeafSprig size={14} className="text-accent" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 px-2">
              {DEMO_THREADS.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full text-left rounded-xl px-4 py-3 transition-all ${
                    activeThreadId === thread.id
                      ? "bg-accent/10 border border-accent/20"
                      : "hover:bg-surface-muted border border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      firstName={thread.providerName.split(" ")[0]}
                      lastName={thread.providerName.split(" ").slice(-1)[0]}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-text truncate">
                          {thread.providerName}
                        </p>
                        {thread.unread && (
                          <span className="h-2 w-2 rounded-full bg-accent shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-text-subtle">
                        {thread.providerTitle}
                      </p>
                      <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed">
                        {thread.lastMessage}
                      </p>
                      <p className="text-[10px] text-text-subtle mt-1">
                        {thread.lastMessageAt}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Active thread */}
        <div className="col-span-8 flex flex-col">
          <Card tone="raised" className="flex-1 flex flex-col">
            {/* Thread header */}
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar
                  firstName={activeThread.providerName.split(" ")[0]}
                  lastName={activeThread.providerName.split(" ").slice(-1)[0]}
                  size="md"
                />
                <div>
                  <CardTitle className="text-base">
                    {activeThread.providerName}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {activeThread.providerTitle}
                  </CardDescription>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Badge tone="success">HIPAA Secure</Badge>
                  <Badge tone="neutral">E2E Encrypted</Badge>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto py-6 space-y-4">
              {activeThread.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.isOwn ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                      msg.isOwn
                        ? "bg-accent text-accent-ink"
                        : "bg-surface-muted text-text-muted border border-border"
                    }`}
                  >
                    {msg.fromInitials}
                  </div>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      msg.isOwn
                        ? "bg-accent/10 border border-accent/20"
                        : "bg-surface-muted border border-border"
                    }`}
                  >
                    <p className="text-sm text-text leading-relaxed">
                      {msg.body}
                    </p>
                    <p className="text-[10px] text-text-subtle mt-1.5">
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>

            {/* Compose */}
            <div className="border-t border-border p-4">
              <div className="flex gap-3">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder="Type a secure message..."
                  className="flex-1"
                />
                <Button
                  size="md"
                  disabled={!draft.trim()}
                  onClick={() => setDraft("")}
                >
                  Send
                </Button>
              </div>
              <p className="text-[10px] text-text-subtle mt-2">
                Messages are encrypted and HIPAA-compliant. Only providers in your
                organization can read this conversation.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
