import { expect, test } from "@playwright/test";

test.describe("Marketplace search and filters", () => {
  test("unknown category slugs render an empty-state banner", async ({ page }) => {
    await page.goto("/marketplace?category=does-not-exist");

    await expect(
      page.getByRole("heading", { name: /Category not found:/ }),
    ).toBeVisible();
    await expect(page.getByText("0 products")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Browse all products" }),
    ).toHaveAttribute("href", "/marketplace");
  });
});
