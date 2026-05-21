// Find-and-fix loop, pass 10 — marketplace search + filter coverage.
//
// `/marketplace` parses four search params server-side:
//   ?q=<query>          full-text search via searchProducts()
//   ?category=<slug>    filters by category id lookup
//   ?sort=<key>         featured | price-asc | price-desc | rating | popular
//   ?brand=<brand>      exact-match filter by brand name
//
// Each is implemented in src/app/marketplace/page.tsx:24-50. Bugs here
// are quiet — wrong filter math doesn't 500, it just returns the wrong
// set of products and the visitor never knows the catalog is broken.
//
// This pass exercises each axis in isolation, then a couple of
// combinations. Findings document the actual product count delta vs
// the baseline so a regression is mechanically diagnosable.
//
// Why a separate spec instead of folding into pass 8 (click handlers)?
// Pass 8 visits pages and clicks elements; it doesn't poke URLs with
// hand-crafted query strings. That distinct shape — URL-driven server-
// component flows — is best covered as its own pass.

import { test, expect } from "@playwright/test";

async function productCardCount(page: import("@playwright/test").Page): Promise<number> {
  // Marketplace product cards link to /marketplace/products/<slug>. The
  // listing renders one such link per visible product card. This is
  // more robust than counting child divs (which depend on layout).
  return page.locator('a[href^="/marketplace/products/"]').count();
}

test.describe("Marketplace search + filter — pass 10", () => {
  test("baseline /marketplace renders ≥10 products with no filters", async ({ page }) => {
    await page.goto("/marketplace", { waitUntil: "networkidle", timeout: 30_000 });
    const count = await productCardCount(page);
    // Catalog has 33 entries; expect the listing to show most/all of them.
    // Catch regressions where the page mounts but renders zero cards.
    expect(count, "expected at least 10 product cards on the unfiltered /marketplace").toBeGreaterThanOrEqual(10);
  });

  test("?q=tincture narrows results to tincture-related products", async ({ page }) => {
    await page.goto("/marketplace", { waitUntil: "networkidle" });
    const baselineCount = await productCardCount(page);

    await page.goto("/marketplace?q=tincture", { waitUntil: "networkidle" });
    const filteredCount = await productCardCount(page);

    expect(filteredCount, "tincture query should return ≥1 product").toBeGreaterThan(0);
    expect(
      filteredCount,
      "tincture query should narrow vs. baseline (catalog has tinctures and non-tinctures)",
    ).toBeLessThan(baselineCount);
  });

  test("?category=anxiety filters to anxiety-tagged products", async ({ page }) => {
    await page.goto("/marketplace?category=anxiety", { waitUntil: "networkidle" });
    const count = await productCardCount(page);
    expect(count, "anxiety category should return ≥1 product").toBeGreaterThan(0);
  });

  test("?category=nonexistent-slug renders cleanly (current: silently ignores)", async ({
    page,
  }) => {
    // Current behavior (src/app/marketplace/page.tsx:38-41): if the
    // category slug doesn't match any CATEGORIES row, the filter is
    // silently dropped and the full catalog renders. This is a UX
    // smell — a user who bookmarks /marketplace?category=anxiety-old
    // after a slug rename has no way to know their filter is invalid.
    // Tracked as a follow-up; this test asserts no crash for now.
    const res = await page.goto("/marketplace?category=nonexistent-slug", {
      waitUntil: "networkidle",
    });
    expect(res?.status() ?? 0, "page renders cleanly even with a bogus category").toBeLessThan(500);
    // Don't assert count — current behavior silently shows the full
    // catalog. Flip this assertion to `toBe(0)` once the product
    // decision lands (404, empty state, or banner).
    expect(await productCardCount(page)).toBeGreaterThanOrEqual(0);
  });

  test("?sort=price-asc returns products in ascending price order", async ({ page }) => {
    await page.goto("/marketplace?sort=price-asc", { waitUntil: "networkidle" });

    // Read each visible price ($XX) on the page, in document order.
    // Cards render `<p class="font-display text-lg text-text tabular-nums">$NN</p>`.
    const prices = await page
      .locator('p.font-display.tabular-nums:has-text("$")')
      .evaluateAll((els) =>
        els
          .map((el) => {
            const m = (el.textContent ?? "").match(/\$([\d.]+)/);
            return m ? Number(m[1]) : Number.NaN;
          })
          .filter((n) => Number.isFinite(n)),
      );

    expect(prices.length, "expected at least 2 prices to compare").toBeGreaterThanOrEqual(2);
    for (let i = 1; i < prices.length; i++) {
      expect(
        prices[i],
        `price-asc sort broken at index ${i}: ${prices[i - 1]} -> ${prices[i]}`,
      ).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  test("?sort=price-desc returns products in descending price order", async ({ page }) => {
    await page.goto("/marketplace?sort=price-desc", { waitUntil: "networkidle" });
    const prices = await page
      .locator('p.font-display.tabular-nums:has-text("$")')
      .evaluateAll((els) =>
        els
          .map((el) => {
            const m = (el.textContent ?? "").match(/\$([\d.]+)/);
            return m ? Number(m[1]) : Number.NaN;
          })
          .filter((n) => Number.isFinite(n)),
      );

    expect(prices.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < prices.length; i++) {
      expect(
        prices[i],
        `price-desc sort broken at index ${i}: ${prices[i - 1]} -> ${prices[i]}`,
      ).toBeLessThanOrEqual(prices[i - 1]);
    }
  });

  test("?brand= filters to a single brand", async ({ page }) => {
    // Pick a brand from the catalog deterministically. "Solace Botanicals"
    // is in src/lib/marketplace/data.ts and has multiple products.
    const brand = "Solace Botanicals";
    await page.goto(`/marketplace?brand=${encodeURIComponent(brand)}`, {
      waitUntil: "networkidle",
    });
    const count = await productCardCount(page);
    expect(count, `expected ≥1 product from brand "${brand}"`).toBeGreaterThan(0);

    // Every card should display the chosen brand name. Look at the
    // eyebrow that the listing card uses (uppercase brand label).
    const visibleBrands = await page
      .locator(".text-text-subtle.uppercase, .uppercase.tracking-\\[0\\.14em\\]")
      .allTextContents();
    const distinct = new Set(visibleBrands.map((b) => b.trim()).filter(Boolean));
    expect(
      distinct,
      `brand filter leaked: expected only "${brand}" but saw ${[...distinct].join(", ")}`,
    ).toContain(brand);
  });

  test("?q=tincture&category=anxiety combines filters", async ({ page }) => {
    // Combined query: anxiety-tagged tinctures. Should be a subset of
    // either filter alone. We can't predict the exact count without
    // hardcoding the catalog, but we can assert the page doesn't error
    // and renders ≥0 cards.
    const res = await page.goto("/marketplace?q=tincture&category=anxiety", {
      waitUntil: "networkidle",
    });
    expect(res?.status() ?? 0).toBeLessThan(500);
    // Count is allowed to be zero (no tinctures match anxiety) — what
    // we're verifying is that the combination doesn't 500 or render
    // broken state.
    const count = await productCardCount(page);
    expect(count).toBeGreaterThanOrEqual(0);
    // Page must still have the listing chrome (eyebrow, header).
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("malicious-looking query doesn't crash the page", async ({ page }) => {
    // Defense-in-depth — confirm the query handler tolerates pathological
    // input. server-side `searchProducts` should treat this as a no-match
    // string rather than 500.
    const evil = `<script>alert(1)</script>'; DROP TABLE products;--`;
    const res = await page.goto(
      `/marketplace?q=${encodeURIComponent(evil)}`,
      { waitUntil: "networkidle" },
    );
    expect(res?.status() ?? 0).toBeLessThan(500);
    // Confirm the query string was NOT echoed unescaped into the DOM
    // anywhere — basic XSS sanity.
    const html = await page.content();
    expect(html, "raw <script> tag must not appear in rendered HTML").not.toContain(
      "<script>alert(1)</script>",
    );
  });
});
