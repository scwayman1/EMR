// Debug spec for EMR-710 — capture the actual network + DOM state
// when the /contact form is submitted, with no intercept stubs. Goal
// is to distinguish:
//   (a) form fires fetch("/api/contact") that gets a non-2xx response,
//   (b) form fires fetch but Playwright's listener registers too late,
//   (c) React onSubmit never attaches and browser does native form
//       submission to the page URL.

import { test } from "@playwright/test";

test("debug /contact submit network trace", async ({ page }) => {
  const requests: { url: string; method: string }[] = [];
  const responses: { url: string; status: number; method: string }[] = [];
  const consoleMessages: string[] = [];
  const errors: string[] = [];

  page.on("request", (req) => {
    requests.push({ url: req.url(), method: req.method() });
  });
  page.on("response", async (res) => {
    responses.push({
      url: res.url(),
      status: res.status(),
      method: res.request().method(),
    });
  });
  page.on("console", (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    errors.push(`pageerror: ${err.message}`);
  });

  await page.goto("/contact", { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForTimeout(2000); // give Clerk + suspense a beat

  // Inspect the form before clicking
  const formInfo = await page.evaluate(() => {
    const form = document.querySelector("form");
    if (!form) return { hasForm: false };
    return {
      hasForm: true,
      action: form.getAttribute("action") || "(none)",
      method: form.getAttribute("method") || "(default GET)",
      // React attaches handlers via property, not attribute — checking
      // `onsubmit` here only catches inline DOM-attribute handlers.
      // The presence of any `__reactProps$*` key on the form tells us
      // React did wire it up.
      reactFiberKey: Object.keys(form).find((k) =>
        k.startsWith("__reactProps$"),
      ) ?? "(none)",
      reactPropsHasOnSubmit: (() => {
        const k = Object.keys(form).find((key) => key.startsWith("__reactProps$"));
        if (!k) return false;
        const props = (form as unknown as Record<string, unknown>)[k] as
          | { onSubmit?: unknown }
          | undefined;
        return typeof props?.onSubmit === "function";
      })(),
      buttonCount: form.querySelectorAll('button[type="submit"]').length,
    };
  });

  console.log("\n=== FORM STATE BEFORE SUBMIT ===");
  console.log(JSON.stringify(formInfo, null, 2));

  // Fill the fields
  await page.locator('input[name="name"]').fill("Debug Probe");
  await page.locator('input[name="email"]').fill("debug@example.com");
  await page.locator('textarea[name="message"]').fill("EMR-710 debug probe");

  const beforeSubmitCount = requests.length;
  console.log(`\nrequests captured BEFORE submit: ${beforeSubmitCount}`);

  // Click submit and wait for any network activity to settle
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3000);

  console.log("\n=== REQUESTS AFTER SUBMIT ===");
  const after = requests.slice(beforeSubmitCount);
  for (const r of after) {
    console.log(`  ${r.method} ${r.url}`);
  }

  console.log("\n=== RESPONSES AFTER SUBMIT ===");
  const afterResponses = responses.slice(-20);
  for (const r of afterResponses) {
    console.log(`  ${r.status} ${r.method} ${r.url}`);
  }

  console.log("\n=== PAGE CONSOLE MESSAGES ===");
  for (const m of consoleMessages.slice(-20)) {
    console.log(`  ${m}`);
  }

  console.log("\n=== PAGE ERRORS ===");
  for (const e of errors) {
    console.log(`  ${e}`);
  }

  console.log(`\n=== PAGE URL AFTER SUBMIT: ${page.url()} ===\n`);
});
