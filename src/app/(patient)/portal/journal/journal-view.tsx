"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea, Input, FieldGroup } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { MOOD_OPTIONS, type JournalEntry, type MoodEmoji } from "@/lib/domain/journal-community";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const TAG_SUGGESTIONS = [
  "sleep",
  "pain",
  "anxiety",
  "mood",
  "tincture",
  "edible",
  "vape",
  "topical",
  "evening",
  "morning",
  "reflection",
];

export function JournalView({
  initialEntries,
  patientId,
}: {
  initialEntries: JournalEntry[];
  patientId: string;
}) {
  const [entries, setEntries] = useState<JournalEntry[]>(initialEntries);
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [mood, setMood] = useState<MoodEmoji>("😊");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);

  function reset() {
    setMood("😊");
    setBody("");
    setTags([]);
    setTagInput("");
    setIsPrivate(true);
    setEditingId(null);
  }

  function startEdit(entry: JournalEntry) {
    setEditingId(entry.id);
    setMood(entry.mood);
    setBody(entry.body);
    setTags(entry.tags);
    setIsPrivate(entry.isPrivate);
    setComposeOpen(true);
  }

  function save() {
    if (!body.trim()) return;
    if (editingId) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editingId
            ? { ...e, mood, body: body.trim(), tags, isPrivate }
            : e,
        ),
      );
    } else {
      const newEntry: JournalEntry = {
        id: `j-${Date.now()}`,
        patientId,
        mood,
        body: body.trim(),
        tags,
        isPrivate,
        createdAt: new Date().toISOString(),
      };
      setEntries((prev) => [newEntry, ...prev]);
    }
    setComposeOpen(false);
    reset();
  }

  function deleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function addTag(t: string) {
    const cleaned = t.trim().toLowerCase();
    if (cleaned && !tags.includes(cleaned)) setTags([...tags, cleaned]);
    setTagInput("");
  }

  // Stats
  const { thisMonth, streak } = useMemo(() => computeStats(entries), [entries]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-emerald-700 font-display text-xl tabular-nums">
            {thisMonth}
          </span>
          <span className="text-text-muted">{thisMonth === 1 ? "entry" : "entries"} this month</span>
        </div>
        <span className="text-text-subtle">·</span>
        <div className="flex items-center gap-2">
          <span className="text-emerald-700 font-display text-xl tabular-nums">{streak}</span>
          <span className="text-text-muted">day streak</span>
        </div>
        <div className="ml-auto">
          {!composeOpen && (
            <Button onClick={() => { reset(); setComposeOpen(true); }} size="sm">
              + New entry
            </Button>
          )}
        </div>
      </div>

      {/* Compose form */}
      {composeOpen && (
        <Card tone="raised">
          <CardContent className="py-5 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-text-subtle mb-2 block">
                How are you feeling?
              </label>
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((opt) => {
                  const active = mood === opt.emoji;
                  return (
                    <button
                      key={opt.emoji}
                      type="button"
                      onClick={() => setMood(opt.emoji)}
                      className={cn(
                        "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-all",
                        active
                          ? "bg-emerald-50 border-emerald-700 scale-105"
                          : "bg-surface border-border hover:bg-surface-muted",
                      )}
                    >
                      <span className="text-xl leading-none">{opt.emoji}</span>
                      <span className="text-[10px] text-text-muted">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <FieldGroup label="What's on your mind?">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="A few sentences about how today went, what you tried, what helped…"
                rows={5}
                autoFocus
              />
            </FieldGroup>

            <div>
              <label className="text-xs uppercase tracking-wider text-text-subtle mb-2 block">
                Tags
              </label>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs"
                  >
                    {t} <span className="text-emerald-700/60">×</span>
                  </button>
                ))}
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  placeholder="Add tag…"
                  className="h-7 w-32 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {TAG_SUGGESTIONS.filter((t) => !tags.includes(t)).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-surface-muted text-text-subtle hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">Privacy:</span>
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border",
                    isPrivate
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-surface text-text-muted border-border",
                  )}
                >
                  Private
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border",
                    !isPrivate
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-surface text-text-muted border-border",
                  )}
                >
                  Share with care team
                </button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setComposeOpen(false); reset(); }}
                >
                  Cancel
                </Button>
                <Button onClick={save} size="sm" disabled={!body.trim()}>
                  {editingId ? "Update" : "Save entry"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries */}
      {entries.length === 0 ? (
        <EmptyState
          title="Your private space to reflect"
          description="Start a journal entry whenever you'd like — no schedule, no pressure. Even one sentence helps you and your care team see what works."
          action={
            <Button onClick={() => { reset(); setComposeOpen(true); }} size="sm">
              Write your first entry
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id} tone="default" className="group">
              <CardContent className="py-5">
                <div className="flex items-start gap-4">
                  <div className="text-3xl leading-none shrink-0 mt-1">{entry.mood}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs text-text-subtle">
                        {formatRelative(entry.createdAt)}
                      </p>
                      <span className="text-text-subtle">·</span>
                      <Badge tone={entry.isPrivate ? "neutral" : "accent"} className="text-[10px]">
                        {entry.isPrivate ? "🔒 Private" : "👥 Shared"}
                      </Badge>
                    </div>
                    <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                      {entry.body}
                    </p>
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {entry.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-muted text-text-muted"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(entry)}
                      className="text-xs text-text-muted hover:text-emerald-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-xs text-text-muted hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function computeStats(entries: JournalEntry[]) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const thisMonth = entries.filter((e) => {
    const d = new Date(e.createdAt);
    return `${d.getFullYear()}-${d.getMonth()}` === monthKey;
  }).length;

  // Compute streak: consecutive days back from today with at least one entry
  const dayKeys = new Set(
    entries.map((e) => {
      const d = new Date(e.createdAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );
  let streak = 0;
  const cursor = new Date(now);
  // allow today OR yesterday to start a streak
  const todayKey = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
  if (!dayKeys.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (true) {
    const k = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (dayKeys.has(k)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return { thisMonth, streak };
}
