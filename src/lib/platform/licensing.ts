/**
 * EMR-147 — Modular licensing surface (operator-facing).
 *
 * Wraps the underlying module catalog (./modules) and Michelin menu
 * (./licensing-menu) with the artifacts the operator licensing page
 * needs: a feature comparison matrix across tiers, a derived brochure
 * model, and a print-ready brochure HTML payload that the existing
 * /api/platform/licensing/menu.html endpoint can serve as a
 * Michelin-style PDF.
 *
 * The data lives in `modules.ts` — this file is the read model.
 */

import {
  MODULE_CATALOG,
  MODULE_PILLAR_LABELS,
  MODULE_TIERS,
  defaultEntitlement,
  hasModule,
  type ModuleEntitlement,
  type ModulePillar,
  type ModuleStatus,
  type ModuleTier,
  type PlatformModule,
} from "./modules";
import { MENU_VERSION, menuCourses, statusStars } from "./licensing-menu";

// ---------------------------------------------------------------------------
// Michelin tier aliases (Bronze / Silver / Gold / Platinum).
//
// The underlying catalog uses the canonical tier ids (starter / professional
// / canopy / enterprise). For sales surfaces we publish Michelin-grade
// aliases — Bronze through Platinum — so brochures, slide decks, and the
// operator menu can speak in the language prospects expect without
// renaming the runtime entitlement schema.
// ---------------------------------------------------------------------------

export type MichelinTier = "bronze" | "silver" | "gold" | "platinum";

/** Bidirectional map between canonical tier ids and Michelin aliases. */
export const MICHELIN_TIER_ALIASES: Record<ModuleTier, MichelinTier> = {
  starter: "bronze",
  professional: "silver",
  canopy: "gold",
  enterprise: "platinum",
};

export const MICHELIN_TO_TIER: Record<MichelinTier, ModuleTier> = {
  bronze: "starter",
  silver: "professional",
  gold: "canopy",
  platinum: "enterprise",
};

export interface MichelinTierProfile {
  id: ModuleTier;
  michelin: MichelinTier;
  label: string;
  blurb: string;
  monthlyLabel: string;
  monthlyList: number | null;
  bestFor: string;
}

export function michelinTierProfiles(): MichelinTierProfile[] {
  return TIER_ORDER.map((id) => {
    const t = MODULE_TIERS[id];
    return {
      id,
      michelin: MICHELIN_TIER_ALIASES[id],
      label: t.label,
      blurb: t.blurb,
      monthlyLabel: t.monthlyLabel,
      monthlyList: t.monthlyList,
      bestFor: t.bestFor,
    };
  });
}

/** Tier columns on the comparison matrix, ordered for display. */
export const TIER_ORDER: ModuleTier[] = [
  "starter",
  "professional",
  "canopy",
  "enterprise",
];

/** Status that should display as "Roadmap" rather than included/excluded. */
const ROADMAP_STATUSES: ModuleStatus[] = ["in_development", "roadmap"];

export type CellKind = "included" | "addon" | "roadmap" | "unavailable";

export interface MatrixCell {
  kind: CellKind;
  label: string;
}

export interface MatrixRow {
  module: PlatformModule;
  stars: number;
  starsLabel: string;
  pillar: ModulePillar;
  pillarLabel: string;
  priceDisplay: string;
  cells: Record<ModuleTier, MatrixCell>;
}

export interface ComparisonMatrix {
  version: string;
  tiers: Array<{
    id: ModuleTier;
    label: string;
    blurb: string;
    monthlyLabel: string;
    bestFor: string;
  }>;
  rowsByPillar: Array<{
    pillar: ModulePillar;
    pillarLabel: string;
    rows: MatrixRow[];
  }>;
}

function priceDisplay(mod: PlatformModule): string {
  if (mod.alaCarteMonthly == null) {
    if (mod.includedIn.length === 1 && mod.includedIn[0] === "enterprise") {
      return "Enterprise";
    }
    return "Included";
  }
  return `$${mod.alaCarteMonthly.toLocaleString()} / provider / mo`;
}

function cellFor(mod: PlatformModule, tier: ModuleTier): MatrixCell {
  if (mod.includedIn.includes(tier)) {
    return { kind: "included", label: "Included" };
  }
  if (ROADMAP_STATUSES.includes(mod.status)) {
    return { kind: "roadmap", label: "Roadmap" };
  }
  if (mod.alaCarteMonthly != null) {
    return {
      kind: "addon",
      label: `+ $${mod.alaCarteMonthly.toLocaleString()}`,
    };
  }
  return { kind: "unavailable", label: "—" };
}

/**
 * Build the cross-tier comparison matrix that the licensing page
 * renders. Modules are grouped by pillar (clinical, billing, etc.)
 * and stable in declaration order.
 */
export function buildComparisonMatrix(): ComparisonMatrix {
  const tiers = TIER_ORDER.map((id) => ({
    id,
    label: MODULE_TIERS[id].label,
    blurb: MODULE_TIERS[id].blurb,
    monthlyLabel: MODULE_TIERS[id].monthlyLabel,
    bestFor: MODULE_TIERS[id].bestFor,
  }));

  const pillarOrder: ModulePillar[] = [
    "clinical",
    "patient_engagement",
    "billing",
    "research",
    "commerce",
    "operations",
    "platform",
  ];

  const rowsByPillar = pillarOrder.map((pillar) => {
    const rows: MatrixRow[] = MODULE_CATALOG.filter(
      (m) => m.pillar === pillar,
    ).map((mod) => {
      const stars = statusStars(mod.status);
      const cells = TIER_ORDER.reduce(
        (acc, tier) => {
          acc[tier] = cellFor(mod, tier);
          return acc;
        },
        {} as Record<ModuleTier, MatrixCell>,
      );
      return {
        module: mod,
        stars: stars.stars,
        starsLabel: stars.label,
        pillar,
        pillarLabel: MODULE_PILLAR_LABELS[pillar],
        priceDisplay: priceDisplay(mod),
        cells,
      };
    });
    return {
      pillar,
      pillarLabel: MODULE_PILLAR_LABELS[pillar],
      rows,
    };
  });

  return { version: MENU_VERSION, tiers, rowsByPillar };
}

/** Headline counts that drive the brochure cover stats. */
export interface BrochureStats {
  modulesTotal: number;
  modulesGa: number;
  modulesPreviewOrBeta: number;
  modulesRoadmap: number;
  totalAgents: number;
}

export function brochureStats(): BrochureStats {
  let ga = 0;
  let pb = 0;
  let rm = 0;
  const agents = new Set<string>();
  for (const m of MODULE_CATALOG) {
    if (m.status === "ga") ga += 1;
    else if (m.status === "beta" || m.status === "preview") pb += 1;
    else rm += 1;
    for (const a of m.agents) agents.add(a);
  }
  return {
    modulesTotal: MODULE_CATALOG.length,
    modulesGa: ga,
    modulesPreviewOrBeta: pb,
    modulesRoadmap: rm,
    totalAgents: agents.size,
  };
}

/**
 * Render the print-ready Michelin-style brochure HTML. Pipes through
 * any browser-style PDF renderer (Chromium /print, Playwright, etc.)
 * to land as a downloadable PDF.
 */
export function renderBrochureHtml(): string {
  const matrix = buildComparisonMatrix();
  const courses = menuCourses();
  const stats = brochureStats();
  const stars = (n: number) =>
    "★".repeat(n) + "☆".repeat(Math.max(0, 3 - n));

  const cellHtml = (cell: MatrixCell): string => {
    const tone =
      cell.kind === "included"
        ? "matrix-included"
        : cell.kind === "addon"
          ? "matrix-addon"
          : cell.kind === "roadmap"
            ? "matrix-roadmap"
            : "matrix-unavailable";
    return `<td class="${tone}">${escapeHtml(cell.label)}</td>`;
  };

  const matrixHtml = matrix.rowsByPillar
    .filter((p) => p.rows.length > 0)
    .map(
      (p) => `
<section class="matrix-pillar">
  <h3>${escapeHtml(p.pillarLabel)}</h3>
  <table class="matrix">
    <thead>
      <tr>
        <th class="module-col">Module</th>
        ${matrix.tiers.map((t) => `<th>${escapeHtml(t.label)}</th>`).join("")}
        <th class="alacarte-col">À la carte</th>
      </tr>
    </thead>
    <tbody>
      ${p.rows
        .map(
          (r) => `
      <tr>
        <td class="module-col">
          <strong>${escapeHtml(r.module.name)}</strong>
          <span class="stars" title="${escapeHtml(r.starsLabel)}">${stars(r.stars)}</span>
          <div class="tagline">${escapeHtml(r.module.tagline)}</div>
        </td>
        ${matrix.tiers.map((t) => cellHtml(r.cells[t.id])).join("")}
        <td class="alacarte-col">${escapeHtml(r.priceDisplay)}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>
</section>`,
    )
    .join("\n");

  const courseHtml = courses
    .map(
      (course) => `
<section class="course">
  <h2>${escapeHtml(course.pillarLabel)}</h2>
  <p class="blurb">${escapeHtml(course.blurb)}</p>
  ${course.modules
    .map(
      (m) => `
  <article class="dish">
    <header>
      <h4>${escapeHtml(m.name)}</h4>
      <span class="stars" title="${escapeHtml(m.starsLabel)}">${stars(m.stars)}</span>
      <span class="price">${escapeHtml(m.priceDisplay)}</span>
    </header>
    <p class="tagline">${escapeHtml(m.tagline)}</p>
    <p class="desc">${escapeHtml(m.description)}</p>
  </article>`,
    )
    .join("\n")}
</section>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Leafjourney Licensing Brochure — ${MENU_VERSION}</title>
  <style>
    @page { size: Letter; margin: 0.6in; }
    body { font-family: Georgia, serif; color: #1a1a1a; line-height: 1.4; }
    h1 { font-family: 'Times New Roman', serif; font-size: 30pt; margin: 0 0 0.1em; }
    h2 { font-family: 'Times New Roman', serif; border-bottom: 1px solid #d3c8a8; padding-bottom: 0.25em; margin-top: 2em; font-size: 18pt; }
    h3 { font-family: 'Times New Roman', serif; font-size: 14pt; margin: 1.2em 0 0.4em; }
    h4 { font-size: 11.5pt; margin: 0; display: inline-block; }
    .stars { color: #b88a00; font-size: 11pt; margin-left: 0.5em; }
    .price { float: right; font-size: 10pt; color: #555; }
    .blurb, .tagline { font-style: italic; color: #555; }
    .desc { font-size: 10pt; color: #333; margin: 0.3em 0; }
    .dish { padding: 0.5em 0; border-bottom: 1px dashed #eadfc4; }
    header.cover { text-align: center; padding: 1.2em 0 1.6em; }
    .stat-row { display: flex; justify-content: center; gap: 2em; margin: 0.6em 0 1em; }
    .stat { text-align: center; }
    .stat-num { font-size: 18pt; font-weight: bold; color: #b88a00; }
    .stat-lbl { font-size: 9pt; color: #555; text-transform: uppercase; letter-spacing: 0.04em; }
    table.matrix { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-top: 0.4em; }
    table.matrix th, table.matrix td { border: 1px solid #eadfc4; padding: 0.3em 0.5em; text-align: center; vertical-align: top; }
    table.matrix th { background: #faf6ec; font-family: 'Times New Roman', serif; }
    table.matrix td.module-col { text-align: left; min-width: 180px; }
    table.matrix td.module-col .tagline { font-size: 8.5pt; color: #777; margin-top: 0.15em; }
    table.matrix td.alacarte-col { font-size: 8.5pt; color: #555; }
    .matrix-included { background: #efe6cf; color: #5a4514; font-weight: 600; }
    .matrix-addon { background: #fff8e6; color: #8a6500; }
    .matrix-roadmap { background: #f3efe5; color: #888; font-style: italic; }
    .matrix-unavailable { color: #bbb; }
    .tier-key { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6em; margin: 1em 0; }
    .tier-key .tier { padding: 0.5em 0.7em; border: 1px solid #eadfc4; border-radius: 4px; }
    .tier-key .tier h4 { font-size: 10.5pt; }
    .tier-key .tier .price { float: none; display: block; font-size: 9pt; color: #555; }
    .tier-key .tier .best { font-size: 8.5pt; color: #777; margin-top: 0.2em; }
    footer { margin-top: 3em; font-size: 9pt; color: #888; text-align: center; }
  </style>
</head>
<body>
  <header class="cover">
    <h1>Leafjourney</h1>
    <p style="font-style:italic;color:#555;margin:0.2em 0;">A modular cannabis EMR — Michelin-style licensing menu</p>
    <p style="font-size:9pt;color:#888">Edition ${escapeHtml(MENU_VERSION)}</p>
    <div class="stat-row">
      <div class="stat"><div class="stat-num">${stats.modulesTotal}</div><div class="stat-lbl">modules</div></div>
      <div class="stat"><div class="stat-num">${stats.modulesGa}</div><div class="stat-lbl">three-star (GA)</div></div>
      <div class="stat"><div class="stat-num">${stats.modulesPreviewOrBeta}</div><div class="stat-lbl">in pilot</div></div>
      <div class="stat"><div class="stat-num">${stats.totalAgents}</div><div class="stat-lbl">AI agents</div></div>
    </div>
  </header>

  <section>
    <h2>Tiers</h2>
    <div class="tier-key">
      ${matrix.tiers
        .map(
          (t) => `
      <div class="tier">
        <h4>${escapeHtml(t.label)}</h4>
        <span class="price">${escapeHtml(t.monthlyLabel)}</span>
        <p style="font-size:9.5pt;margin:0.3em 0 0;font-style:italic;color:#555">${escapeHtml(t.blurb)}</p>
        <p class="best">${escapeHtml(t.bestFor)}</p>
      </div>`,
        )
        .join("")}
    </div>
  </section>

  <section>
    <h2>Feature comparison</h2>
    ${matrixHtml}
  </section>

  <section>
    <h2>Course menu</h2>
    ${courseHtml}
  </section>

  <footer>
    Three stars: production ready. Two stars: battle-tested in pilots. One star: preview.
    All prices are list per provider, per month, billed annually.
  </footer>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// Org-scoped authorization helpers
//
// The platform stores entitlements on Organization.metadata (see EMR-044
// schema). Until that DB column lands, we resolve entitlements through an
// in-memory store that callers can prime in tests / seed scripts. The
// public surface — `loadEntitlement`, `hasModuleLicense`, and the
// posture builder — does not change when persistence flips on.
// ---------------------------------------------------------------------------

const entitlementStore = new Map<string, ModuleEntitlement>();

/** Seed an entitlement for an organization. Test/admin path. */
export function setEntitlement(entitlement: ModuleEntitlement): void {
  entitlementStore.set(entitlement.organizationId, entitlement);
}

/** Best-effort lookup. Falls back to the default "starter" entitlement. */
export async function loadEntitlement(
  organizationId: string,
): Promise<ModuleEntitlement> {
  return entitlementStore.get(organizationId) ?? defaultEntitlement(organizationId);
}

/**
 * Authorization gate — does an organization currently hold a license for
 * a given module? Modules can be referenced by their catalog id
 * (e.g. "scribe-agent") or by a friendly alias understood by the
 * licensing menu (e.g. "scheduling", "billing").
 */
export async function hasModuleLicense(
  organizationId: string,
  moduleName: string,
): Promise<boolean> {
  const entitlement = await loadEntitlement(organizationId);
  const moduleId = resolveModuleId(moduleName);
  if (!moduleId) return false;
  return hasModule(entitlement, moduleId);
}

/**
 * Synchronous variant used by route handlers that have already loaded
 * the entitlement (e.g. middleware that hydrated session.entitlement).
 */
export function hasModuleLicenseSync(
  entitlement: ModuleEntitlement,
  moduleName: string,
): boolean {
  const moduleId = resolveModuleId(moduleName);
  if (!moduleId) return false;
  return hasModule(entitlement, moduleId);
}

/**
 * Friendly module aliases — short names sales can quote that resolve to
 * catalog ids. Anything not in the alias map falls back to a direct id
 * lookup against MODULE_CATALOG.
 */
const MODULE_ALIASES: Record<string, string> = {
  scheduling: "scheduler",
  schedule: "scheduler",
  billing: "revenue-cycle",
  rcm: "revenue-cycle",
  telehealth: "ehr-bridge",
  charts: "ehr-core",
  chart: "ehr-core",
  ehr: "ehr-core",
  dispensary: "marketplace",
  marketplace: "marketplace",
  portal: "patient-portal",
  research: "research-portal",
  cfo: "cfo-controller",
};

function resolveModuleId(moduleName: string): string | null {
  const key = moduleName.trim().toLowerCase();
  const aliased = MODULE_ALIASES[key];
  if (aliased) return aliased;
  if (MODULE_CATALOG.some((m) => m.id === moduleName)) return moduleName;
  if (MODULE_CATALOG.some((m) => m.id === key)) return key;
  return null;
}

// ---------------------------------------------------------------------------
// Licensing posture — the JSON shape served by /api/platform/licensing
// for a given organization. Drives both the operator UI and any
// downstream gating (vendor portal, partner audits).
// ---------------------------------------------------------------------------

export interface LicensingPostureModule {
  id: string;
  name: string;
  pillar: ModulePillar;
  pillarLabel: string;
  tagline: string;
  status: ModuleStatus;
  stars: number;
  active: boolean;
  reason: "tier" | "addOn" | "addon-available" | "roadmap" | "disabled";
  alaCarteMonthly: number | null;
}

export interface IntegrationConnectionState {
  vendor: "epic" | "cerner" | "practice_fusion";
  label: string;
  status: "connected" | "configured" | "available" | "coming_soon";
  detail: string;
}

export interface LicensingPosture {
  organizationId: string;
  generatedAt: string;
  version: string;
  tier: {
    id: ModuleTier;
    michelin: MichelinTier;
    label: string;
    monthlyLabel: string;
    monthlyList: number | null;
    blurb: string;
  };
  addOns: string[];
  disabled: string[];
  modules: LicensingPostureModule[];
  totals: {
    activeModules: number;
    monthlyTierList: number | null;
    monthlyAddOnList: number;
    monthlyTotalList: number | null;
  };
  integrations: IntegrationConnectionState[];
}

/** Build the licensing posture document for an organization. */
export function buildLicensingPosture(
  entitlement: ModuleEntitlement,
): LicensingPosture {
  const tierProfile = michelinTierProfiles().find(
    (p) => p.id === entitlement.tier,
  )!;

  const modules: LicensingPostureModule[] = MODULE_CATALOG.map((m) => {
    const includedByTier = m.includedIn.includes(entitlement.tier);
    const isAddOn = entitlement.addOns.includes(m.id);
    const isDisabled = entitlement.disabled.includes(m.id);
    const active = !isDisabled && (includedByTier || isAddOn);
    let reason: LicensingPostureModule["reason"];
    if (isDisabled) reason = "disabled";
    else if (includedByTier) reason = "tier";
    else if (isAddOn) reason = "addOn";
    else if (m.status === "in_development" || m.status === "roadmap")
      reason = "roadmap";
    else reason = "addon-available";

    return {
      id: m.id,
      name: m.name,
      pillar: m.pillar,
      pillarLabel: MODULE_PILLAR_LABELS[m.pillar],
      tagline: m.tagline,
      status: m.status,
      stars: statusStars(m.status).stars,
      active,
      reason,
      alaCarteMonthly: m.alaCarteMonthly,
    };
  });

  let addOnTotal = 0;
  for (const id of entitlement.addOns) {
    const mod = MODULE_CATALOG.find((m) => m.id === id);
    if (mod?.alaCarteMonthly) addOnTotal += mod.alaCarteMonthly;
  }

  const monthlyTier = tierProfile.monthlyList;
  const monthlyTotal =
    monthlyTier == null ? null : monthlyTier + addOnTotal;

  return {
    organizationId: entitlement.organizationId,
    generatedAt: new Date().toISOString(),
    version: MENU_VERSION,
    tier: {
      id: tierProfile.id,
      michelin: tierProfile.michelin,
      label: tierProfile.label,
      monthlyLabel: tierProfile.monthlyLabel,
      monthlyList: tierProfile.monthlyList,
      blurb: tierProfile.blurb,
    },
    addOns: entitlement.addOns,
    disabled: entitlement.disabled,
    modules,
    totals: {
      activeModules: modules.filter((m) => m.active).length,
      monthlyTierList: monthlyTier,
      monthlyAddOnList: addOnTotal,
      monthlyTotalList: monthlyTotal,
    },
    integrations: integrationConnectionStates(),
  };
}

/**
 * Stubbed connection state for the third-party EHR bridges we surface on
 * the licensing console. Real wiring lives behind the EHR Bridge module
 * (EMR-013 / EMR-082) once provisioned; for now we publish a stable
 * shape so the UI and API stay aligned.
 */
export function integrationConnectionStates(): IntegrationConnectionState[] {
  return [
    {
      vendor: "epic",
      label: "Epic — App Orchard FHIR R4",
      status: "available",
      detail:
        "OAuth2 SMART launch and bulk FHIR export ready; provision a client_id in Settings → Integrations.",
    },
    {
      vendor: "cerner",
      label: "Cerner Millennium — FHIR R4 + HL7 v2",
      status: "configured",
      detail:
        "Sandbox tenant linked; production cutover pending counter-signature on the BAA.",
    },
    {
      vendor: "practice_fusion",
      label: "Practice Fusion — CCD/CDA + DocumentReference",
      status: "coming_soon",
      detail:
        "Inbound DocumentReference round-trips land in EMR-082; reciprocal pull is roadmap.",
    },
  ];
}

// Re-export the canonical types for callers that import everything from
// this module (the operator page and the JSON API both do).
export type { ModuleEntitlement, ModulePillar, ModuleTier, PlatformModule };
