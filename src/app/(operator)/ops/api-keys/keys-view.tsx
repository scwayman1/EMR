"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, FieldGroup } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

type Scope = "read-only" | "read-write" | "admin";

interface ApiKey {
  id: string;
  label: string;
  preview: string;
  scope: Scope;
  lastUsed: string | null;
  createdAt: string;
}

const SEED_KEYS: ApiKey[] = [
  {
    id: "k1",
    label: "Analytics ETL pipeline",
    preview: "sk_live_•••abc123",
    scope: "read-only",
    lastUsed: "2026-04-16 09:30",
    createdAt: "2026-01-12",
  },
  {
    id: "k2",
    label: "Mobile app backend",
    preview: "sk_live_•••xyz789",
    scope: "read-write",
    lastUsed: "2026-04-16 10:41",
    createdAt: "2026-02-28",
  },
  {
    id: "k3",
    label: "Scott's laptop (dev)",
    preview: "sk_test_•••dev042",
    scope: "admin",
    lastUsed: "2026-04-12 14:22",
    createdAt: "2026-03-15",
  },
];

const SCOPE_TONE: Record<Scope, "neutral" | "info" | "warning"> = {
  "read-only": "neutral",
  "read-write": "info",
  admin: "warning",
};

function randomKey() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "sk_live_";
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function KeysView() {
  const [keys, setKeys] = useState<ApiKey[]>(SEED_KEYS);
  const [showGenerate, setShowGenerate] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newScope, setNewScope] = useState<Scope>("read-only");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  const generate = () => {
    if (!newLabel.trim()) return;
    const full = randomKey();
    const preview = `${full.slice(0, 8)}•••${full.slice(-6)}`;
    const newKey: ApiKey = {
      id: `k-${Date.now()}`,
      label: newLabel.trim(),
      preview,
      scope: newScope,
      lastUsed: null,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setKeys([newKey, ...keys]);
    setGeneratedKey(full);
  };

  const closeModal = () => {
    setShowGenerate(false);
    setGeneratedKey(null);
    setNewLabel("");
    setNewScope("read-only");
    setCopied(false);
  };

  const copyKey = async () => {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fail silently in demo
    }
  };

  const confirmRevoke = () => {
    if (!revokeTarget) return;
    setKeys(keys.filter((k) => k.id !== revokeTarget.id));
    setRevokeTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-highlight/30 bg-highlight-soft/60 p-4 flex items-start gap-3">
        <div className="text-xl">⚠</div>
        <div>
          <div className="text-sm font-medium text-text">HIPAA notice</div>
          <div className="text-xs text-text-muted mt-1">
            API keys may grant access to protected health information (PHI). Treat them like
            passwords. Rotate regularly, never commit to source control, and revoke immediately
            if exposed.
          </div>
        </div>
      </div>

      <Card tone="raised">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active keys</CardTitle>
              <CardDescription>{keys.length} keys issued for this organization</CardDescription>
            </div>
            <Button onClick={() => setShowGenerate(true)}>Generate new key</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {keys.map((k) => (
              <div key={k.id} className="py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text">{k.label}</span>
                    <Badge tone={SCOPE_TONE[k.scope]}>{k.scope}</Badge>
                  </div>
                  <code className="text-xs font-mono text-text-muted">{k.preview}</code>
                  <div className="text-xs text-text-subtle mt-0.5">
                    Created {k.createdAt} · Last used{" "}
                    {k.lastUsed ?? <span className="italic">never</span>}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setRevokeTarget(k)}
                >
                  Revoke
                </Button>
              </div>
            ))}
            {keys.length === 0 && (
              <div className="py-8 text-center text-sm text-text-muted">
                No API keys. Generate one to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showGenerate && (
        <Modal onClose={closeModal}>
          {!generatedKey ? (
            <>
              <h2 className="font-display text-xl text-text mb-2">Generate new API key</h2>
              <p className="text-sm text-text-muted mb-5">
                Choose a scope carefully. The key will be shown only once — copy it before closing.
              </p>
              <div className="space-y-4">
                <FieldGroup label="Label" htmlFor="label" hint="Human-friendly name for this key">
                  <Input
                    id="label"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Analytics pipeline"
                  />
                </FieldGroup>
                <FieldGroup label="Permissions" htmlFor="scope">
                  <select
                    id="scope"
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value as Scope)}
                    className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text"
                  >
                    <option value="read-only">Read-only (GET endpoints)</option>
                    <option value="read-write">Read-write (GET + POST/PATCH)</option>
                    <option value="admin">Admin (full access incl. destructive)</option>
                  </select>
                </FieldGroup>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button onClick={generate} disabled={!newLabel.trim()}>
                  Generate
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-xl text-text mb-2">Copy your API key now</h2>
              <p className="text-sm text-text-muted mb-4">
                This is the only time the full key will be shown. Store it in a secrets manager.
              </p>
              <div className="rounded-md border border-highlight/40 bg-highlight-soft p-3 font-mono text-sm break-all text-text">
                {generatedKey}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={copyKey}>
                  {copied ? "Copied!" : "Copy to clipboard"}
                </Button>
                <Button onClick={closeModal}>I've saved it</Button>
              </div>
            </>
          )}
        </Modal>
      )}

      {revokeTarget && (
        <Modal onClose={() => setRevokeTarget(null)}>
          <h2 className="font-display text-xl text-text mb-2">Revoke this key?</h2>
          <p className="text-sm text-text-muted mb-4">
            Revoking <span className="font-medium">{revokeTarget.label}</span> will immediately
            invalidate any integration using it. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmRevoke}>
              Revoke key
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "bg-surface border border-border rounded-xl shadow-xl w-full max-w-md p-6"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
