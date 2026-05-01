/**
 * EMR-147 — Modular EMR licensing menu (Michelin-style).
 *
 * Generates the structured licensing menu we hand to prospects. The menu
 * itself is rendered server-side (HTML on /licensing, plus a printable
 * PDF endpoint at /api/platform/licensing/menu.pdf). The data shape here
 * is what both surfaces — and the sales deck export — read from.
 *
 * "Michelin-style" = each module gets a tagline, a star rating reflecting
 * status maturity, and a one-line "best paired with" that signals
 * which other modules round out the meal.
 */
import {
  MODULE_CATALOG,
  MODULE_PILLAR_LABELS,
  MODULE_TIERS,
  type ModulePillar,
  type ModuleStatus,
  type PlatformModule,
} from "./modules";

export const MENU_VERSION = "2026-04 v3";

/**
 * Map status → 1-3 stars. GA gets 3, beta 2, preview 1, future plates
 * are listed as "tasting menu" without stars.
 */
export function statusStars(status: ModuleStatus): {
  stars: number;
  label: string;
} {
  switch (status) {
    case "ga":
      return { stars: 3, label: "Three stars — production ready, signed BAA included." };
    case "beta":
      return { stars: 2, label: "Two stars — battle-tested in pilot deployments." };
    case "preview":
      return { stars: 1, label: "One star — preview, schema stable, integrations in progress." };
    case "in_development":
      return { stars: 0, label: "Tasting menu — in active development this quarter." };
    case "roadmap":
      return { stars: 0, label: "Reservation list — roadmap, ETA available on request." };
  }
}

/** A "course" on the menu — a pillar plus its modules in display order. */
export interface MenuCourse {
  pillar: ModulePillar;
  pillarLabel: string;
  /** Editorial blurb describing the pillar — written for sales. */
  blurb: string;
  modules: MenuItem[];
}

export interface MenuItem extends PlatformModule {
  stars: number;
  starsLabel: string;
  /** Module ids this pairs well with (Michelin-style "best paired with"). */
  pairsWith: string[];
  /** Display price string for the menu line. */
  priceDisplay: string;
}

const PILLAR_BLURBS: Record<ModulePillar, string> = {
  clinical:
    "The chart, the note, the order. The clinician's hands rest here.",
  patient_engagement:
    "What the patient sees and tends. Soft surfaces, real outcomes.",
  billing:
    "The fleet that turns documentation into deposits — without a biller babysitting every transition.",
  research:
    "Cohorts, RWE, and IRB-grade exports. Built for journals and pharma partners.",
  commerce:
    "Seed Trove. An Amazon for cannabis health, gated by clinical context.",
  operations:
    "Schedule, marketing, ledgers, alerts. Practice ops without the spreadsheets.",
  platform:
    "The unseen scaffolding — agents, audit, encryption — every other course rides on.",
};

const PAIRINGS: Record<string, string[]> = {
  "ehr-core": ["scribe-agent", "patient-portal", "platform-bedrock"],
  "scribe-agent": ["ehr-core", "fda-rx-bank", "mips-extrapolator"],
  "ehr-bridge": ["ehr-core", "fda-rx-bank"],
  "patient-portal": ["ehr-core", "fda-rx-bank"],
  "revenue-cycle": ["ehr-core", "mips-extrapolator", "cfo-controller"],
  "mips-extrapolator": ["ehr-core", "revenue-cycle"],
  "fda-rx-bank": ["ehr-core", "scribe-agent", "patient-portal"],
  "research-portal": ["ehr-core", "marketplace"],
  marketplace: ["patient-portal", "research-portal"],
  "cfo-controller": ["revenue-cycle", "scheduler"],
  scheduler: ["patient-portal", "ehr-core"],
  "platform-bedrock": [],
  "white-label": ["platform-bedrock"],
};

function priceDisplay(mod: PlatformModule): string {
  if (mod.alaCarteMonthly == null) {
    if (mod.includedIn.length === 1 && mod.includedIn[0] === "enterprise") {
      return "Enterprise";
    }
    return "Included";
  }
  return `$${mod.alaCarteMonthly.toLocaleString()} / provider / mo`;
}

export function menuCourses(): MenuCourse[] {
  const order: ModulePillar[] = [
    "clinical",
    "patient_engagement",
    "billing",
    "research",
    "commerce",
    "operations",
    "platform",
  ];

  return order.map((pillar) => {
    const modules = MODULE_CATALOG.filter((m) => m.pillar === pillar);
    const items: MenuItem[] = modules.map((m) => {
      const stars = statusStars(m.status);
      return {
        ...m,
        stars: stars.stars,
        starsLabel: stars.label,
        pairsWith: PAIRINGS[m.id] ?? [],
        priceDisplay: priceDisplay(m),
      };
    });
    return {
      pillar,
      pillarLabel: MODULE_PILLAR_LABELS[pillar],
      blurb: PILLAR_BLURBS[pillar],
      modules: items,
    };
  });
}

/** Ready-to-render JSON menu, including tier reference table. */
export function renderMenuJson() {
  return {
    version: MENU_VERSION,
    generatedAt: new Date().toISOString(),
    tiers: Object.entries(MODULE_TIERS).map(([id, t]) => ({
      id,
      label: t.label,
      blurb: t.blurb,
      monthlyLabel: t.monthlyLabel,
      bestFor: t.bestFor,
    })),
    courses: menuCourses(),
  };
}

/**
 * Render a printable HTML version of the menu (the PDF endpoint pipes
 * this through a browser-style PDF render — but the HTML alone is a
 * valid one-pager). Keeps formatting stable and review-friendly.
 */
export function renderMenuHtml(): string {
  const courses = menuCourses();
  const stars = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 3 - n));
  const courseHtml = courses
    .map((course) => {
      const items = course.modules
        .map((m) => {
          const pair =
            m.pairsWith.length > 0
              ? `<p class="pair">Best paired with: ${m.pairsWith
                  .map((p) =>
                    MODULE_CATALOG.find((mm) => mm.id === p)?.name ?? p,
                  )
                  .join(", ")}</p>`
              : "";
          return `
<article class="dish">
  <header>
    <h3>${escapeHtml(m.name)}</h3>
    <span class="stars" title="${escapeHtml(m.starsLabel)}">${stars(m.stars)}</span>
    <span class="price">${escapeHtml(m.priceDisplay)}</span>
  </header>
  <p class="tagline">${escapeHtml(m.tagline)}</p>
  <p class="desc">${escapeHtml(m.description)}</p>
  ${pair}
</article>`;
        })
        .join("\n");
      return `
<section class="course">
  <h2>${escapeHtml(course.pillarLabel)}</h2>
  <p class="blurb">${escapeHtml(course.blurb)}</p>
  ${items}
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Leafjourney Licensing Menu — ${MENU_VERSION}</title>
  <style>
    @page { size: Letter; margin: 0.75in; }
    body { font-family: Georgia, serif; color: #1a1a1a; line-height: 1.4; max-width: 7in; margin: 0 auto; }
    h1 { font-family: 'Times New Roman', serif; font-size: 28pt; margin-bottom: 0.1em; }
    h2 { font-family: 'Times New Roman', serif; border-bottom: 1px solid #d3c8a8; padding-bottom: 0.25em; margin-top: 2em; font-size: 18pt; }
    h3 { font-size: 12pt; margin: 0; display: inline-block; }
    .stars { color: #b88a00; font-size: 11pt; margin-left: 0.5em; }
    .price { float: right; font-size: 10pt; color: #555; }
    .blurb { font-style: italic; color: #555; margin-bottom: 1em; }
    .dish { padding: 0.6em 0; border-bottom: 1px dashed #eadfc4; }
    .tagline { font-style: italic; margin: 0.2em 0; }
    .desc { font-size: 10pt; color: #333; margin: 0.3em 0; }
    .pair { font-size: 9pt; color: #777; margin: 0.2em 0 0; }
    header.cover { text-align: center; padding: 2em 0 1em; }
    header.cover .sub { color: #555; font-style: italic; }
  </style>
</head>
<body>
  <header class="cover">
    <h1>Leafjourney</h1>
    <p class="sub">A licensing menu — Michelin-style.</p>
    <p class="sub">Edition ${escapeHtml(MENU_VERSION)}</p>
  </header>
  ${courseHtml}
  <footer style="margin-top:3em;font-size:9pt;color:#888;text-align:center">
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
