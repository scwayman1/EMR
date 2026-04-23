"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface Dataset {
  id: string;
  title: string;
  description: string;
  sampleSize: number;
  lastUpdated: string;
  priceUsd: number;
  category: string;
  publisher: string;
}

export function MarketplaceView({ datasets }: { datasets: Dataset[] }) {
  const [purchased, setPurchased] = useState<string | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [publishForm, setPublishForm] = useState({
    title: "",
    description: "",
    priceUsd: 10000,
  });
  const [publishedConfirmation, setPublishedConfirmation] = useState(false);

  function purchase(id: string) {
    setPurchased(id);
    setTimeout(() => setPurchased(null), 3000);
  }

  function publish() {
    setPublishedConfirmation(true);
    setShowPublish(false);
    setPublishForm({ title: "", description: "", priceUsd: 10000 });
    setTimeout(() => setPublishedConfirmation(false), 3500);
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <Badge tone="info">🔒 HIPAA Safe Harbor de-identified</Badge>
        <Button onClick={() => setShowPublish((v) => !v)}>
          {showPublish ? "Cancel" : "Publish new dataset"}
        </Button>
      </div>

      {publishedConfirmation && (
        <Card
          tone="raised"
          className="mb-6 border-emerald-400 bg-emerald-50/60"
        >
          <CardContent className="py-4">
            <p className="text-sm text-emerald-900 font-medium">
              ✓ Dataset submitted for de-identification review. It will appear
              in the marketplace within 48 hours.
            </p>
          </CardContent>
        </Card>
      )}

      {showPublish && (
        <Card tone="raised" className="mb-6">
          <CardHeader>
            <CardTitle>Publish new dataset</CardTitle>
            <CardDescription>
              Build a cohort in the{" "}
              <Link
                href="/ops/analytics-lab/cohort-builder"
                className="text-accent hover:underline"
              >
                Cohort Builder
              </Link>{" "}
              first, then title and describe it here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                  Title
                </span>
                <input
                  value={publishForm.title}
                  onChange={(e) =>
                    setPublishForm({ ...publishForm, title: e.target.value })
                  }
                  placeholder="e.g. Migraine cohort — 6mo outcomes"
                  className="mt-1.5 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                  Description
                </span>
                <textarea
                  value={publishForm.description}
                  onChange={(e) =>
                    setPublishForm({
                      ...publishForm,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                  Asking price (USD)
                </span>
                <input
                  type="number"
                  min={0}
                  value={publishForm.priceUsd}
                  onChange={(e) =>
                    setPublishForm({
                      ...publishForm,
                      priceUsd: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1.5 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                />
              </label>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowPublish(false)}>
                  Cancel
                </Button>
                <Button onClick={publish}>Submit for review</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {datasets.map((d) => (
          <Card key={d.id} tone="raised" className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <Badge tone="accent">{d.category}</Badge>
                <span className="text-xs text-text-subtle">
                  {new Date(d.lastUpdated).toLocaleDateString()}
                </span>
              </div>
              <CardTitle className="mt-3">{d.title}</CardTitle>
              <CardDescription>{d.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
              <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-border/60">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                    Sample size
                  </p>
                  <p className="font-display text-lg text-text mt-0.5 tabular-nums">
                    n = {d.sampleSize.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium">
                    Price
                  </p>
                  <p className="font-display text-lg text-text mt-0.5 tabular-nums">
                    ${d.priceUsd.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-text-subtle mb-3">
                Published by {d.publisher}
              </p>
              <Button
                onClick={() => purchase(d.id)}
                variant={purchased === d.id ? "secondary" : "primary"}
                className="w-full"
              >
                {purchased === d.id
                  ? "✓ Purchase request sent"
                  : "Purchase dataset"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-text-subtle mt-8 leading-relaxed max-w-3xl">
        <strong>De-identification:</strong> All datasets on this marketplace
        have undergone HIPAA Safe Harbor de-identification: removal of the 18
        specified identifiers, date-shifting, and k-anonymity review by our
        privacy team. Cell sizes below 11 are suppressed. No re-identification
        attempts are permitted under the data use agreement.
      </p>
    </>
  );
}
