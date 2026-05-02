/**
 * Module registry — EMR-044
 *
 * Runtime façade over the static `MODULE_CATALOG` (in ./modules.ts) that
 * other parts of the platform consult to ask "is module X enabled for org
 * Y?" and to discover sibling modules dynamically. The catalog is the
 * source of truth for *what exists*; this file is the source of truth for
 * *what is wired up at runtime*.
 *
 * Design goals:
 *  - One import for callers: `import { moduleRegistry } from "@/lib/platform/module-registry"`.
 *  - Pure / synchronous — no DB hits inside the gate. Entitlement loading
 *    happens at the request boundary; the registry just answers.
 *  - Pluggable — future modules (e.g. white-label add-ons) register via
 *    `register()` instead of editing modules.ts in lock-step.
 *  - Observable — every gate decision emits a `ModuleGateEvent` so the
 *    licensing console can audit what was checked, what was denied, and
 *    why.
 */

import {
  MODULE_CATALOG,
  MODULE_PILLAR_LABELS,
  MODULE_TIERS,
  activeModules as activeModulesPure,
  alaCarteTotalMonthly as alaCarteTotalMonthlyPure,
  defaultEntitlement as defaultEntitlementPure,
  hasModule as hasModulePure,
  modulesByPillar as modulesByPillarPure,
  type ModuleEntitlement,
  type ModulePillar,
  type ModuleTier,
  type PlatformModule,
} from "./modules";

export type {
  ModuleEntitlement,
  ModulePillar,
  ModuleTier,
  PlatformModule,
} from "./modules";

export interface ModuleGateEvent {
  organizationId: string;
  moduleId: string;
  decision: "allow" | "deny";
  reason: "tier" | "addOn" | "disabled" | "unknown";
  occurredAt: string;
}

type GateListener = (event: ModuleGateEvent) => void;

class ModuleRegistry {
  private extras: Map<string, PlatformModule> = new Map();
  private listeners: Set<GateListener> = new Set();

  /** All modules — catalog plus runtime-registered extras. */
  list(): PlatformModule[] {
    return [...MODULE_CATALOG, ...this.extras.values()];
  }

  /** Lookup a module by id; returns undefined if neither catalog nor extras have it. */
  get(id: string): PlatformModule | undefined {
    const fromCatalog = MODULE_CATALOG.find((m) => m.id === id);
    return fromCatalog ?? this.extras.get(id);
  }

  /** Group modules by pillar — used by the licensing menu. */
  byPillar(): Record<ModulePillar, PlatformModule[]> {
    const base = modulesByPillarPure();
    for (const extra of this.extras.values()) {
      base[extra.pillar].push(extra);
    }
    return base;
  }

  /** Add a module at runtime (e.g. white-label OEM SKU loaded from the DB). */
  register(mod: PlatformModule): void {
    if (MODULE_CATALOG.some((m) => m.id === mod.id) || this.extras.has(mod.id)) {
      throw new Error(`Module already registered: ${mod.id}`);
    }
    this.extras.set(mod.id, mod);
  }

  /** Remove a runtime-registered module. No-op for catalog modules. */
  unregister(id: string): void {
    this.extras.delete(id);
  }

  /** Subscribe to gate decisions for audit logging. */
  onGate(fn: GateListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Decide whether an entitlement grants access to a module. Emits a
   * gate event so the licensing console can audit denials.
   */
  hasModule(entitlement: ModuleEntitlement, moduleId: string): boolean {
    const mod = this.get(moduleId);
    let decision: ModuleGateEvent["decision"];
    let reason: ModuleGateEvent["reason"];
    if (!mod) {
      decision = "deny";
      reason = "unknown";
    } else if (entitlement.disabled.includes(moduleId)) {
      decision = "deny";
      reason = "disabled";
    } else if (entitlement.addOns.includes(moduleId)) {
      decision = "allow";
      reason = "addOn";
    } else if (mod.includedIn.includes(entitlement.tier)) {
      decision = "allow";
      reason = "tier";
    } else {
      decision = "deny";
      reason = "tier";
    }
    this.emit({
      organizationId: entitlement.organizationId,
      moduleId,
      decision,
      reason,
      occurredAt: new Date().toISOString(),
    });
    return decision === "allow";
  }

  /** Convenience: which catalog modules an entitlement currently grants. */
  activeModules(entitlement: ModuleEntitlement): PlatformModule[] {
    const fromCatalog = activeModulesPure(entitlement);
    const fromExtras = Array.from(this.extras.values()).filter((m) =>
      this.hasModule(entitlement, m.id),
    );
    return [...fromCatalog, ...fromExtras];
  }

  /** Sum the à-la-carte sticker price for the given module ids. */
  alaCarteTotalMonthly(moduleIds: string[]): number {
    const baseline = alaCarteTotalMonthlyPure(moduleIds);
    let extras = 0;
    for (const id of moduleIds) {
      const m = this.extras.get(id);
      if (m?.alaCarteMonthly) extras += m.alaCarteMonthly;
    }
    return baseline + extras;
  }

  /** Default entitlement used when an org is first provisioned. */
  defaultEntitlement(organizationId: string): ModuleEntitlement {
    return defaultEntitlementPure(organizationId);
  }

  /**
   * Pure variant of hasModule — does not emit a gate event. Use in tight
   * loops where you've already gated and just need a boolean.
   */
  hasModulePure(entitlement: ModuleEntitlement, moduleId: string): boolean {
    return hasModulePure(entitlement, moduleId);
  }

  /** Reset runtime extras — used by tests. */
  reset(): void {
    this.extras.clear();
    this.listeners.clear();
  }

  private emit(event: ModuleGateEvent): void {
    for (const fn of this.listeners) {
      try {
        fn(event);
      } catch {
        /* listener errors are swallowed so a bad audit hook can't deny gates */
      }
    }
  }
}

export const moduleRegistry = new ModuleRegistry();

/**
 * Helper for server components / route handlers — load the entitlement
 * from a caller-supplied function and gate. Inverted control keeps this
 * file dependency-free of Prisma.
 */
export async function gate<T>(
  loadEntitlement: () => Promise<ModuleEntitlement>,
  moduleId: string,
  onAllow: () => Promise<T>,
  onDeny: () => Promise<T> | T,
): Promise<T> {
  const entitlement = await loadEntitlement();
  if (moduleRegistry.hasModule(entitlement, moduleId)) {
    return onAllow();
  }
  return onDeny();
}

/** Re-exports for callers that imported from this file historically. */
export {
  MODULE_CATALOG,
  MODULE_PILLAR_LABELS,
  MODULE_TIERS,
};
