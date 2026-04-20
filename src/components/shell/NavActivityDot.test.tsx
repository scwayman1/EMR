import * as React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NavActivityDot } from "./NavActivityDot";

/**
 * Render-level tests for the ambient agent dot. Locks in the aria contract,
 * tone-to-color mapping, and the animate-pulse rhythm so the icon rail work
 * can't silently regress the status indicator.
 *
 * Uses `renderToString` from react-dom/server — no JSDOM needed because we
 * only assert on the static markup. The component is purely presentational.
 */
describe("NavActivityDot (render)", () => {
  it("exposes the AI-agent aria-label for screen readers", () => {
    const html = renderToString(<NavActivityDot tone="active" />);
    expect(html).toContain('aria-label="AI agent working here"');
  });

  it("announces itself as a status region", () => {
    const html = renderToString(<NavActivityDot tone="info" />);
    expect(html).toContain('role="status"');
  });

  it("renders emerald-400 for tone=active", () => {
    const html = renderToString(<NavActivityDot tone="active" />);
    expect(html).toContain("bg-emerald-400");
    expect(html).not.toContain("bg-sky-400");
  });

  it("renders sky-400 for tone=info", () => {
    const html = renderToString(<NavActivityDot tone="info" />);
    expect(html).toContain("bg-sky-400");
    expect(html).not.toContain("bg-emerald-400");
  });

  it("always applies animate-pulse so the rhythm matches the danger pill", () => {
    const activeHtml = renderToString(<NavActivityDot tone="active" />);
    const infoHtml = renderToString(<NavActivityDot tone="info" />);
    expect(activeHtml).toContain("animate-pulse");
    expect(infoHtml).toContain("animate-pulse");
  });

  it("is a 1.5-unit rounded span (h-1.5 w-1.5 rounded-full)", () => {
    const html = renderToString(<NavActivityDot tone="active" />);
    expect(html).toContain("h-1.5");
    expect(html).toContain("w-1.5");
    expect(html).toContain("rounded-full");
  });
});
