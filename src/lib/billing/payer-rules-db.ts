// EMR-218 — DB-backed payer rules
// -------------------------------
// Wraps the in-code PAYER_RULES registry with a Prisma-backed override layer
// so operations can edit rules without a deploy. The runtime resolver
// (`resolvePayerRuleAsync`) checks the DB first, falls back to the in-code
// PAYER_RULES, and finally to DEFAULT_PAYER_RULE. Edits flow through
// `savePayerRule()` which writes a PayerRuleAuditLog entry every time.

import type {
  PayerRule as PrismaPayerRule,
  PayerClass as PrismaPayerClass,
  CorrectedClaimFrequency as PrismaFreq,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  DEFAULT_PAYER_RULE,
  PAYER_RULES,
  type PayerRule as CodePayerRule,
  type PayerClass,
} from "./payer-rules";

// ---------------------------------------------------------------------------
// Mappers — Prisma row ↔ in-code shape
// ---------------------------------------------------------------------------

const FREQ_FROM_PRISMA: Record<PrismaFreq, CodePayerRule["correctedClaimFrequency"]> = {
  c7: "7",
  c6: "6",
  c8_then_1: "8_then_1",
};

const FREQ_TO_PRISMA: Record<CodePayerRule["correctedClaimFrequency"], PrismaFreq> = {
  "7": "c7",
  "6": "c6",
  "8_then_1": "c8_then_1",
};

export function fromPrismaPayerRule(row: PrismaPayerRule): CodePayerRule {
  return {
    id: row.id,
    displayName: row.displayName,
    aliases: row.aliases,
    class: row.class as PayerClass,
    timelyFilingDays: row.timelyFilingDays,
    correctedTimelyFilingDays: row.correctedTimelyFilingDays,
    appealDeadlines: {
      level1Days: row.appealLevel1Days,
      level2Days: row.appealLevel2Days,
      externalReviewDays: row.appealExternalReviewDays,
    },
    ackSlaDays: row.ackSlaDays,
    adjudicationSlaDays: row.adjudicationSlaDays,
    eligibilityTtlHours: row.eligibilityTtlHours,
    correctedClaimFrequency: FREQ_FROM_PRISMA[row.correctedClaimFrequency],
    honorsMod25OnZ71: row.honorsMod25OnZ71,
    requiresPriorAuthForCannabis: row.requiresPriorAuthForCannabis,
    excludesCannabis: row.excludesCannabis,
    cannabisPolicyCitation: row.cannabisPolicyCitation,
    supportsElectronicSubmission: row.supportsElectronicSubmission,
    attachmentChannels: row.attachmentChannels as CodePayerRule["attachmentChannels"],
  };
}

export function toPrismaPayerRuleData(rule: CodePayerRule): Omit<
  PrismaPayerRule,
  "createdAt" | "updatedAt" | "lastReviewedAt" | "organizationId"
> {
  return {
    id: rule.id,
    displayName: rule.displayName,
    aliases: rule.aliases,
    class: rule.class as PrismaPayerClass,
    timelyFilingDays: rule.timelyFilingDays,
    correctedTimelyFilingDays: rule.correctedTimelyFilingDays,
    appealLevel1Days: rule.appealDeadlines.level1Days,
    appealLevel2Days: rule.appealDeadlines.level2Days,
    appealExternalReviewDays: rule.appealDeadlines.externalReviewDays,
    ackSlaDays: rule.ackSlaDays,
    adjudicationSlaDays: rule.adjudicationSlaDays,
    eligibilityTtlHours: rule.eligibilityTtlHours,
    correctedClaimFrequency: FREQ_TO_PRISMA[rule.correctedClaimFrequency],
    honorsMod25OnZ71: rule.honorsMod25OnZ71,
    requiresPriorAuthForCannabis: rule.requiresPriorAuthForCannabis,
    excludesCannabis: rule.excludesCannabis,
    cannabisPolicyCitation: rule.cannabisPolicyCitation,
    supportsElectronicSubmission: rule.supportsElectronicSubmission,
    attachmentChannels: [...rule.attachmentChannels],
  };
}

// ---------------------------------------------------------------------------
// Process-local cache — invalidated on save
// ---------------------------------------------------------------------------

interface CacheEntry {
  rules: Map<string, CodePayerRule>;
  loadedAt: number;
}
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>(); // key = organizationId | "__global__"

function cacheKey(orgId: string | null): string {
  return orgId ?? "__global__";
}

export function invalidatePayerRuleCache(orgId: string | null = null): void {
  if (orgId === null) {
    cache.clear();
  } else {
    cache.delete(cacheKey(orgId));
  }
}

async function loadRules(organizationId: string | null): Promise<Map<string, CodePayerRule>> {
  const key = cacheKey(organizationId);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.rules;
  }

  // Layer global → org-specific so org-specific wins on key collision.
  const [globals, orgSpecific] = await Promise.all([
    prisma.payerRule.findMany({ where: { organizationId: null } }),
    organizationId
      ? prisma.payerRule.findMany({ where: { organizationId } })
      : Promise.resolve([]),
  ]);

  const map = new Map<string, CodePayerRule>();
  for (const row of globals) map.set(row.id, fromPrismaPayerRule(row));
  for (const row of orgSpecific) map.set(row.id, fromPrismaPayerRule(row));

  cache.set(key, { rules: map, loadedAt: Date.now() });
  return map;
}

// ---------------------------------------------------------------------------
// Resolver — DB → in-code → DEFAULT
// ---------------------------------------------------------------------------

export interface ResolvePayerInput {
  payerId?: string | null;
  payerName?: string | null;
  organizationId?: string | null;
}

/** Resolve a PayerRule for a claim, preferring DB rows over the in-code
 *  registry. Async because it hits the DB; callers in hot loops should
 *  batch via cache (already enabled with 60s TTL). */
export async function resolvePayerRuleAsync(input: ResolvePayerInput): Promise<CodePayerRule> {
  const orgRules = await loadRules(input.organizationId ?? null);

  // 1. Direct id match in DB
  const id = (input.payerId ?? "").toLowerCase().trim();
  if (id && orgRules.has(id)) return orgRules.get(id)!;

  // 2. Alias / displayName match in DB
  const name = (input.payerName ?? "").toLowerCase().trim();
  if (name) {
    for (const rule of orgRules.values()) {
      if (rule.aliases.some((a) => name.includes(a))) return rule;
      if (name.includes(rule.displayName.toLowerCase())) return rule;
    }
  }

  // 3. Fall through to the in-code registry
  if (id) {
    const byId = PAYER_RULES.find((r) => r.id === id);
    if (byId) return byId;
  }
  if (name) {
    for (const rule of PAYER_RULES) {
      if (rule.aliases.some((a) => name.includes(a))) return rule;
      if (name.includes(rule.displayName.toLowerCase())) return rule;
    }
  }

  return DEFAULT_PAYER_RULE;
}

// ---------------------------------------------------------------------------
// Audit-logged save
// ---------------------------------------------------------------------------

export interface SavePayerRuleInput {
  rule: CodePayerRule;
  organizationId: string | null; // null = global edit (admin-only)
  editedById: string | null;
  reason?: string;
}

/** Diff helper — compare two rules and return the field names that changed. */
export function diffPayerRule(before: CodePayerRule, after: CodePayerRule): string[] {
  const fields: string[] = [];
  const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    const a = JSON.stringify((before as any)[k]);
    const b = JSON.stringify((after as any)[k]);
    if (a !== b) fields.push(k);
  }
  return fields;
}

export async function savePayerRule(input: SavePayerRuleInput): Promise<CodePayerRule> {
  const data = toPrismaPayerRuleData(input.rule);
  const existing = await prisma.payerRule.findUnique({
    where: { id: input.rule.id },
  });
  const beforeSnapshot = existing ? fromPrismaPayerRule(existing) : null;

  const saved = await prisma.payerRule.upsert({
    where: { id: input.rule.id },
    create: {
      ...data,
      organizationId: input.organizationId,
      lastReviewedAt: new Date(),
    },
    update: {
      ...data,
      organizationId: input.organizationId,
      lastReviewedAt: new Date(),
    },
  });

  await prisma.payerRuleAuditLog.create({
    data: {
      payerRuleId: saved.id,
      organizationId: input.organizationId,
      editedById: input.editedById,
      before: (beforeSnapshot ?? {}) as object,
      after: input.rule as unknown as object,
      changedFields: beforeSnapshot ? diffPayerRule(beforeSnapshot, input.rule) : Object.keys(input.rule),
      reason: input.reason ?? null,
    },
  });

  invalidatePayerRuleCache(input.organizationId);
  return fromPrismaPayerRule(saved);
}

// ---------------------------------------------------------------------------
// Staleness banner — "this rule hasn't been reviewed in > 6 months"
// ---------------------------------------------------------------------------

export const PAYER_RULE_STALE_MS = 1000 * 60 * 60 * 24 * 30 * 6; // ~6 months

export function isStaleRule(lastReviewedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - lastReviewedAt.getTime() > PAYER_RULE_STALE_MS;
}

// ---------------------------------------------------------------------------
// Seed — load all in-code PAYER_RULES into the DB as global rows
// ---------------------------------------------------------------------------

/** Seed runner. Idempotent: upserts each in-code rule as a global row. */
export async function seedPayerRulesFromCode(): Promise<{ loaded: number }> {
  let loaded = 0;
  for (const rule of PAYER_RULES) {
    const data = toPrismaPayerRuleData(rule);
    await prisma.payerRule.upsert({
      where: { id: rule.id },
      create: { ...data, organizationId: null, lastReviewedAt: new Date() },
      update: { ...data, organizationId: null },
    });
    loaded++;
  }
  invalidatePayerRuleCache();
  return { loaded };
}
