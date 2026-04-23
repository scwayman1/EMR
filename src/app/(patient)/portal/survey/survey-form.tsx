"use client";

import { useState } from "react";
import {
  POST_VISIT_SURVEY,
  classifyNPS,
  NPS_COLORS,
  type SurveyResponse,
} from "@/lib/domain/satisfaction-survey";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export function SurveyForm() {
  const [responses, setResponses] = useState<Map<string, string | number>>(new Map());
  const [submitted, setSubmitted] = useState(false);

  const setResponse = (questionId: string, value: string | number) => {
    setResponses((prev) => {
      const next = new Map(prev);
      next.set(questionId, value);
      return next;
    });
  };

  const allRequiredFilled = POST_VISIT_SURVEY.filter((q) => q.required).every((q) => {
    const val = responses.get(q.id);
    return val !== undefined && val !== "";
  });

  const handleSubmit = () => {
    if (!allRequiredFilled) return;
    setSubmitted(true);
  };

  const npsScore = responses.get("nps") as number | undefined;
  const npsClassification = npsScore !== undefined ? classifyNPS(npsScore) : null;

  if (submitted) {
    const npsColors = npsClassification ? NPS_COLORS[npsClassification] : null;
    return (
      <Card tone="raised" className="text-center">
        <CardContent className="py-12">
          <div className="h-16 w-16 mx-auto mb-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M5 14l7 7L23 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-text mb-2">
            Thank you for your feedback!
          </h2>
          <p className="text-sm text-text-muted mb-4">
            Your responses help us improve care for everyone at Leafjourney.
          </p>
          {npsColors && (
            <span
              className={cn(
                "inline-flex items-center px-3 py-1 text-sm font-medium rounded-full",
                npsColors.bg,
                npsColors.text,
              )}
            >
              {npsColors.label}
            </span>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {POST_VISIT_SURVEY.map((question) => (
        <Card key={question.id}>
          <CardHeader>
            <CardTitle className="text-base flex items-start gap-2">
              {question.text}
              {question.required && (
                <span className="text-red-500 text-sm font-normal">*</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {question.type === "nps" && (
              <NpsSelector
                value={responses.get(question.id) as number | undefined}
                onChange={(v) => setResponse(question.id, v)}
              />
            )}
            {question.type === "rating" && (
              <StarRating
                value={responses.get(question.id) as number | undefined}
                onChange={(v) => setResponse(question.id, v)}
              />
            )}
            {question.type === "multiple_choice" && question.options && (
              <RadioGroup
                options={question.options}
                value={responses.get(question.id) as string | undefined}
                onChange={(v) => setResponse(question.id, v)}
              />
            )}
            {question.type === "text" && (
              <Textarea
                placeholder="Type your answer here..."
                value={(responses.get(question.id) as string) ?? ""}
                onChange={(e) => setResponse(question.id, e.target.value)}
                rows={3}
              />
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-center pt-4">
        <Button size="lg" onClick={handleSubmit} disabled={!allRequiredFilled}>
          Submit feedback
        </Button>
      </div>

      {!allRequiredFilled && (
        <p className="text-xs text-text-subtle text-center">
          Please complete all required (<span className="text-red-500">*</span>) questions before
          submitting.
        </p>
      )}
    </div>
  );
}

/* ── NPS Selector (0-10) ─────────────────────────── */

function NpsSelector({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {Array.from({ length: 11 }).map((_, i) => {
          let colorClass: string;
          if (i <= 6) colorClass = "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
          else if (i <= 8)
            colorClass = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
          else colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";

          const isSelected = value === i;

          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i)}
              className={cn(
                "h-10 w-10 rounded-lg border text-sm font-medium transition-all",
                isSelected ? "ring-2 ring-offset-1 ring-accent scale-110" : colorClass,
                isSelected && i <= 6 && "bg-red-500 text-white border-red-500",
                isSelected && i > 6 && i <= 8 && "bg-amber-500 text-white border-amber-500",
                isSelected && i > 8 && "bg-emerald-600 text-white border-emerald-600",
              )}
            >
              {i}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-text-subtle">
        <span>Not at all likely</span>
        <span>Extremely likely</span>
      </div>
    </div>
  );
}

/* ── Star Rating ─────────────────────────────────── */

function StarRating({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayValue = hovered ?? value ?? 0;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          className="p-1 transition-transform hover:scale-110"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill={star <= displayValue ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
            className={cn(
              "transition-colors",
              star <= displayValue ? "text-amber-400" : "text-gray-300",
            )}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
      {value && (
        <span className="text-sm text-text-muted ml-2">{value}/5</span>
      )}
    </div>
  );
}

/* ── Radio Group ─────────────────────────────────── */

function RadioGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label
          key={option}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all",
            value === option
              ? "border-accent bg-accent/5 ring-1 ring-accent"
              : "border-border hover:border-border-strong hover:bg-surface-muted",
          )}
        >
          <span
            className={cn(
              "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
              value === option ? "border-accent" : "border-border-strong",
            )}
          >
            {value === option && (
              <span className="h-2 w-2 rounded-full bg-accent" />
            )}
          </span>
          <span className="text-sm text-text">{option}</span>
        </label>
      ))}
    </div>
  );
}
