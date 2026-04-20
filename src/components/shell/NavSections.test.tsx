import * as React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NavSections } from "./NavSections";
import type { NavSection } from "./nav-sections";

/**
 * Render-level tests for the legacy stacked rail.
 *
 * `usePathname()` returns null outside a Next router context, which the
 * component already normalizes to "" — so we can render straight to string.
 * No JSDOM required; we assert on the static markup.
 */

describe("NavSections (render)", () => {
  it("renders a collapsible group header with aria-expanded=true by default", () => {
    const sections: NavSection[] = [
      {
        label: "Billing",
        items: [
          { label: "Denials", href: "/ops/denials" },
          { label: "Scrub", href: "/ops/scrub" },
        ],
      },
    ];
    const html = renderToString(<NavSections sections={sections} />);
    expect(html).toContain('id="nav-group-billing"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-controls="nav-group-billing-panel"');
    // The header renders the label text.
    expect(html).toContain(">Billing<");
  });

  it("collapses the group when section.defaultCollapsed is true", () => {
    const sections: NavSection[] = [
      {
        label: "Operations",
        defaultCollapsed: true,
        items: [{ label: "Staff", href: "/ops/staff-schedule" }],
      },
    ];
    const html = renderToString(<NavSections sections={sections} />);
    expect(html).toContain('aria-expanded="false"');
    // The <div hidden> attribute marks the panel as collapsed.
    expect(html).toContain("hidden");
  });

  it("renders a flat (unlabeled) section without any group button", () => {
    const sections: NavSection[] = [
      {
        items: [{ label: "Overview", href: "/ops" }],
      },
    ];
    const html = renderToString(<NavSections sections={sections} />);
    expect(html).not.toContain("aria-expanded");
    expect(html).not.toContain("nav-group-");
    expect(html).toContain('href="/ops"');
    expect(html).toContain(">Overview<");
  });

  it("renders the ambient activity dot next to items flagged with activity", () => {
    const sections: NavSection[] = [
      {
        label: "Inbox",
        items: [
          {
            label: "Messages",
            href: "/ops/messages",
            count: 2,
            activity: {
              href: "/ops/messages",
              agentKey: "drafts",
              tone: "active",
            },
          },
        ],
      },
    ];
    const html = renderToString(<NavSections sections={sections} />);
    // The NavActivityDot renders its aria-label.
    expect(html).toContain('aria-label="AI agent working here"');
    // Active tone → emerald.
    expect(html).toContain("bg-emerald-400");
    expect(html).toContain("animate-pulse");
  });

  it("uses sky-400 for activity tone=info", () => {
    const sections: NavSection[] = [
      {
        label: "Agents",
        items: [
          {
            label: "Watchers",
            href: "/ops/agents",
            activity: {
              href: "/ops/agents",
              agentKey: "watcher",
              tone: "info",
            },
          },
        ],
      },
    ];
    const html = renderToString(<NavSections sections={sections} />);
    expect(html).toContain("bg-sky-400");
    expect(html).toContain('aria-label="AI agent working here"');
  });

  it("omits the activity dot entirely when no item carries `activity`", () => {
    const sections: NavSection[] = [
      {
        label: "Quiet",
        items: [{ label: "Settings", href: "/ops/settings" }],
      },
    ];
    const html = renderToString(<NavSections sections={sections} />);
    expect(html).not.toContain('aria-label="AI agent working here"');
    expect(html).not.toContain("bg-emerald-400");
    expect(html).not.toContain("bg-sky-400");
  });

  it("renders the count badge next to (not instead of) the activity dot", () => {
    const sections: NavSection[] = [
      {
        label: "Inbox",
        items: [
          {
            label: "Messages",
            href: "/ops/messages",
            count: 4,
            countTone: "highlight",
            activity: {
              href: "/ops/messages",
              agentKey: "drafts",
              tone: "active",
            },
          },
        ],
      },
    ];
    const html = renderToString(<NavSections sections={sections} />);
    // Both the dot and the count pill are present.
    expect(html).toContain('aria-label="AI agent working here"');
    // The count is surfaced in the row's aria-label for screen readers.
    expect(html).toContain("(4 waiting)");
  });
});
