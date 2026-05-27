"use client";

// EMR-424 — Wizard Step 8: Apply roles & permission groups.
//
// Different UX from steps 6/7: a role list (Practice Admin, Physician, Nurse,
// MA, Front Desk, Patient) where each role expands to expose the permission
// groups attached to it. Admin can override per-role permission groups.
//
// Persistence shape (TRANSITIONAL — see TODO below):
//   draft.rolePermissionTemplateIds = [`role-overrides:json:<base64>`]
// The base64 segment encodes a JSON object of type
//   Record<roleSlug, { groups: string[] }>.
// EMR-441 will replace this with a real role-template registry; until then
// this single-string encoding lets us round-trip the override structure
// through the existing `string[]` schema without a Prisma migration.

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible } from "@/components/ui/collapsible";
import { Eyebrow } from "@/components/ui/ornament";
import {
  KNOWN_PERMISSION_GROUPS,
  KNOWN_ROLES,
} from "@/lib/onboarding/known-templates";
import { diffTemplateIds, hasDiff } from "@/lib/onboarding/template-diff";
import type { WizardStepProps } from "@/lib/onboarding/wizard-types";
import { cn } from "@/lib/utils/cn";

import { DiffBanner } from "./_template-picker-shared";

// ---------------------------------------------------------------------------
// TODO(EMR-441): replace this transitional encoding with a real role-template
// schema once the role/permission registry ships. The wizard persists the
// per-role override map inside a single string ID:
//   `role-overrides:json:<base64-encoded JSON>`
// On read we decode that prefix; on write we re-encode the live overrides.
// ---------------------------------------------------------------------------

const ROLE_OVERRIDE_PREFIX = "role-overrides:json:";

type RoleOverrides = Record<string, { groups: string[] }>;

function encodeRoleOverrides(overrides: RoleOverrides): string {
  const json = JSON.stringify(overrides);
  // btoa is available in browsers; the wizard step is "use client" so
  // this only runs in the browser bundle.
  const b64 =
    typeof btoa !== "undefined"
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, "utf8").toString("base64");
  return `${ROLE_OVERRIDE_PREFIX}${b64}`;
}

function decodeRoleOverrides(ids: string[] | undefined): RoleOverrides {
  if (!ids) return {};
  for (const id of ids) {
    if (!id.startsWith(ROLE_OVERRIDE_PREFIX)) continue;
    const b64 = id.slice(ROLE_OVERRIDE_PREFIX.length);
    try {
      const json =
        typeof atob !== "undefined"
          ? decodeURIComponent(escape(atob(b64)))
          : Buffer.from(b64, "base64").toString("utf8");
      const parsed = JSON.parse(json) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as RoleOverrides;
      }
    } catch {
      // Corrupt payload — fall through and return defaults.
    }
  }
  return {};
}

/** Sorted, deduped list of group ids for a given role's current selection. */
function effectiveGroups(
  roleId: string,
  overrides: RoleOverrides,
  defaults: string[],
): string[] {
  const override = overrides[roleId];
  return override ? override.groups : defaults;
}

export function Step8ApplyRoles({
  draft,
  patch,
  goNext,
  goBack,
}: WizardStepProps) {
  // Local mirror of the override map. We hydrate from the persisted
  // encoded string on mount and write back through `patch` whenever the
  // admin toggles a permission.
  const [overrides, setOverrides] = React.useState<RoleOverrides>(() =>
    decodeRoleOverrides(draft.rolePermissionTemplateIds ?? undefined),
  );

  // Defaults baseline used by the diff banner: the union of every role's
  // default permissions, namespaced as `role:perm` so a permission moved
  // between roles registers as a real change.
  const defaultsFlat = React.useMemo(() => {
    const flat: string[] = [];
    for (const role of KNOWN_ROLES) {
      for (const perm of role.defaultPermissions) {
        flat.push(`${role.id}:${perm}`);
      }
    }
    return flat;
  }, []);

  const currentFlat = React.useMemo(() => {
    const flat: string[] = [];
    for (const role of KNOWN_ROLES) {
      const groups = effectiveGroups(
        role.id,
        overrides,
        role.defaultPermissions,
      );
      for (const perm of groups) {
        flat.push(`${role.id}:${perm}`);
      }
    }
    return flat;
  }, [overrides]);

  const diff = React.useMemo(
    () => diffTemplateIds(defaultsFlat, currentFlat),
    [defaultsFlat, currentFlat],
  );

  // Push the encoded payload back into the draft. We always write the full
  // object (not a partial diff) so the persisted shape is self-contained.
  function persist(next: RoleOverrides) {
    setOverrides(next);
    const onlyDirty: RoleOverrides = {};
    for (const role of KNOWN_ROLES) {
      const override = next[role.id];
      if (!override) continue;
      // If the override matches defaults exactly, drop it.
      const matchesDefault =
        override.groups.length === role.defaultPermissions.length &&
        override.groups.every((g) => role.defaultPermissions.includes(g));
      if (!matchesDefault) onlyDirty[role.id] = override;
    }
    if (Object.keys(onlyDirty).length === 0) {
      patch({ rolePermissionTemplateIds: [] });
    } else {
      patch({ rolePermissionTemplateIds: [encodeRoleOverrides(onlyDirty)] });
    }
  }

  function togglePermission(roleId: string, perm: string) {
    const role = KNOWN_ROLES.find((r) => r.id === roleId);
    if (!role) return;
    const currentGroups = effectiveGroups(
      roleId,
      overrides,
      role.defaultPermissions,
    );
    const nextGroups = currentGroups.includes(perm)
      ? currentGroups.filter((p) => p !== perm)
      : [...currentGroups, perm];
    const nextOverrides: RoleOverrides = {
      ...overrides,
      [roleId]: { groups: nextGroups },
    };
    persist(nextOverrides);
  }

  function restoreDefaults() {
    persist({});
  }

  function restoreRole(roleId: string) {
    const next: RoleOverrides = { ...overrides };
    delete next[roleId];
    persist(next);
  }

  return (
    <section className="space-y-6" aria-labelledby="step-8-heading">
      <header className="space-y-2">
        <Eyebrow>Step 8 of 15</Eyebrow>
        <h2
          id="step-8-heading"
          className="font-display text-2xl font-medium text-text tracking-tight"
        >
          Apply roles & permission groups
        </h2>
        <p className="text-sm text-text-muted max-w-2xl">
          Each role ships with a sensible set of permission groups. Expand a
          role to fine-tune what people in that role can do. Overrides are
          tracked vs the default permission set.
        </p>
      </header>

      <Card tone="raised">
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                Default role kit
              </p>
              <p className="text-sm text-text mt-1">
                {KNOWN_ROLES.length} roles &middot; {defaultsFlat.length} default
                permission grants.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={restoreDefaults}
              disabled={!hasDiff(diff)}
            >
              Restore defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <DiffBanner
        diff={diff}
        unitSingular="permission grant"
        unitPlural="permission grants"
      />

      <div className="grid gap-3" role="group" aria-label="Roles">
        {KNOWN_ROLES.map((role) => {
          const groups = effectiveGroups(
            role.id,
            overrides,
            role.defaultPermissions,
          );
          const overridden = role.id in overrides;
          return (
            <Collapsible
              key={role.id}
              tone="default"
              title={
                <div className="flex flex-wrap items-center gap-2">
                  <span>{role.label}</span>
                  <span className="text-[11px] font-normal text-text-muted">
                    {groups.length} of{" "}
                    {Object.keys(KNOWN_PERMISSION_GROUPS).length} groups
                  </span>
                  {overridden && (
                    <span className="rounded-full bg-highlight-soft px-2 py-0.5 text-[10px] font-medium text-[color:var(--highlight-hover)]">
                      Overridden
                    </span>
                  )}
                </div>
              }
              meta={role.description}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-muted">
                    Toggle permission groups for{" "}
                    <span className="font-medium text-text">{role.label}</span>.
                  </p>
                  {overridden && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => restoreRole(role.id)}
                    >
                      Reset role
                    </Button>
                  )}
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {Object.entries(KNOWN_PERMISSION_GROUPS).map(
                    ([permId, permLabel]) => {
                      const checked = groups.includes(permId);
                      const isDefault =
                        role.defaultPermissions.includes(permId);
                      return (
                        <label
                          key={`${role.id}-${permId}`}
                          className={cn(
                            "flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors",
                            checked
                              ? "border-accent/60 bg-accent-soft/30"
                              : "border-border/70 bg-surface hover:border-border-strong",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              togglePermission(role.id, permId)
                            }
                            className="mt-0.5 h-4 w-4 accent-[color:var(--accent)]"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-medium text-text">
                                {permLabel}
                              </span>
                              {isDefault && (
                                <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">
                                  Default
                                </span>
                              )}
                            </div>
                            <code className="text-[11px] text-text-muted">
                              {permId}
                            </code>
                          </div>
                        </label>
                      );
                    },
                  )}
                </div>
              </div>
            </Collapsible>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={goBack}>
          Back
        </Button>
        <Button onClick={goNext}>Continue</Button>
      </div>
    </section>
  );
}
