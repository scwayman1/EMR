"use client";

// Mindfulness emoji check-in — EMR-138
// Lightweight, client-side mood + intention picker that lives on the lifestyle
// page. Stores the most recent entry in localStorage so the patient can see
// their own day-to-day pattern without persisting clinical data unless they
// choose to share it.

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const MOODS = [
  { emoji: "\u{1F60C}", label: "Calm", value: "calm" },
  { emoji: "\u{1F642}", label: "Steady", value: "steady" },
  { emoji: "\u{1F610}", label: "Foggy", value: "foggy" },
  { emoji: "\u{1F622}", label: "Heavy", value: "heavy" },
  { emoji: "\u{1F624}", label: "Tense", value: "tense" },
] as const;

const INTENTIONS = [
  { emoji: "\u{1F33F}", label: "Be patient with myself", value: "patience" },
  { emoji: "\u{1F4AC}", label: "Reach out to someone", value: "connect" },
  { emoji: "\u{1F4AA}", label: "Move my body once", value: "move" },
  { emoji: "\u{1F4DA}", label: "Learn one thing", value: "learn" },
  { emoji: "\u{1F64F}", label: "Practice gratitude", value: "gratitude" },
] as const;

type MoodValue = typeof MOODS[number]["value"];
type IntentionValue = typeof INTENTIONS[number]["value"];

const STORAGE_KEY = "lj-mindfulness-checkin";

interface CheckIn {
  mood: MoodValue;
  intention: IntentionValue;
  timestamp: string;
}

function readLast(): CheckIn | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as CheckIn;
  } catch {
    return null;
  }
}

function writeLast(entry: CheckIn) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // ignore quota / private mode
  }
}

export function MindfulnessCheckIn() {
  const [mood, setMood] = useState<MoodValue | null>(null);
  const [intention, setIntention] = useState<IntentionValue | null>(null);
  const [last, setLast] = useState<CheckIn | null>(null);
  const [savedJustNow, setSavedJustNow] = useState(false);

  useEffect(() => {
    setLast(readLast());
  }, []);

  function save() {
    if (!mood || !intention) return;
    const entry: CheckIn = {
      mood,
      intention,
      timestamp: new Date().toISOString(),
    };
    writeLast(entry);
    setLast(entry);
    setSavedJustNow(true);
    setTimeout(() => setSavedJustNow(false), 1800);
  }

  return (
    <Card tone="raised" className="overflow-hidden">
      <CardContent className="py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
            Mindfulness check-in
          </p>
          {last && (
            <Badge tone="neutral" className="text-[10px]">
              Last: {MOODS.find((m) => m.value === last.mood)?.emoji} ·{" "}
              {INTENTIONS.find((i) => i.value === last.intention)?.label}
            </Badge>
          )}
        </div>

        <p className="text-xs text-text-subtle mb-2 uppercase tracking-wider">
          How does your mind feel right now?
        </p>
        <div className="flex flex-wrap gap-2 mb-5">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              aria-pressed={mood === m.value}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                mood === m.value
                  ? "bg-accent-soft ring-2 ring-accent/30 scale-105"
                  : "hover:bg-surface-muted"
              }`}
            >
              <span className="text-2xl" aria-hidden="true">
                {m.emoji}
              </span>
              <span className="text-[11px] text-text-subtle">{m.label}</span>
            </button>
          ))}
        </div>

        <p className="text-xs text-text-subtle mb-2 uppercase tracking-wider">
          One intention for the next hour
        </p>
        <div className="flex flex-wrap gap-2 mb-5">
          {INTENTIONS.map((i) => (
            <button
              key={i.value}
              type="button"
              onClick={() => setIntention(i.value)}
              aria-pressed={intention === i.value}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                intention === i.value
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-text-muted hover:border-accent/40 hover:text-text"
              }`}
            >
              <span aria-hidden="true">{i.emoji}</span>
              <span>{i.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-text-subtle">
            Stored only on this device. Share with your team in your next visit
            if you want.
          </p>
          <Button
            size="sm"
            onClick={save}
            disabled={!mood || !intention}
            variant={savedJustNow ? "secondary" : "primary"}
          >
            {savedJustNow ? "Saved" : "Save check-in"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
