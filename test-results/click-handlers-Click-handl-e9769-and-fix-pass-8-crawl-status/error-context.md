# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: click-handlers.spec.ts >> Click handlers — find-and-fix pass 8 >> crawl /status
- Location: e2e/click-handlers.spec.ts:411:9

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.waitForTimeout: Test timeout of 180000ms exceeded.
```

# Test source

```ts
  192 |     function accessibleName(el: HTMLElement): string {
  193 |       const aria = el.getAttribute("aria-label");
  194 |       if (aria && aria.trim()) return aria.trim();
  195 |       const labelledBy = el.getAttribute("aria-labelledby");
  196 |       if (labelledBy) {
  197 |         const t = labelledBy
  198 |           .split(/\s+/)
  199 |           .map((id) => document.getElementById(id)?.textContent ?? "")
  200 |           .join(" ")
  201 |           .trim();
  202 |         if (t) return t;
  203 |       }
  204 |       const title = el.getAttribute("title");
  205 |       if (title && title.trim()) return title.trim();
  206 |       const txt = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  207 |       if (txt) return txt;
  208 |       // Icon buttons sometimes only have an <img alt>
  209 |       const img = el.querySelector("img[alt]");
  210 |       if (img) return img.getAttribute("alt")!.trim();
  211 |       return "";
  212 |     }
  213 | 
  214 |     return interactive.map((el) => ({
  215 |       selector: cssPath(el),
  216 |       text: accessibleName(el).slice(0, 80),
  217 |       tagRole: `${el.tagName.toLowerCase()}${
  218 |         el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : ""
  219 |       }`,
  220 |     }));
  221 |   });
  222 | }
  223 | 
  224 | async function clickAndObserve(
  225 |   context: BrowserContext,
  226 |   routeUrl: string,
  227 |   probe: ElementProbe,
  228 | ): Promise<Finding[]> {
  229 |   const local: Finding[] = [];
  230 |   const page = await context.newPage();
  231 |   const consoleErrors: string[] = [];
  232 |   const failed: { url: string; status: number; method: string }[] = [];
  233 |   let dialogText: string | null = null;
  234 |   let threw: Error | null = null;
  235 |   let crashed = false;
  236 | 
  237 |   page.on("console", (msg) => {
  238 |     if (msg.type() === "error") {
  239 |       const t = msg.text();
  240 |       if (t.includes("Failed to load resource")) return;
  241 |       if (t.includes("[Fast Refresh]")) return;
  242 |       consoleErrors.push(t);
  243 |     }
  244 |   });
  245 |   page.on("requestfailed", (req) => {
  246 |     if (req.url().includes("/_next/")) return;
  247 |     const u = new URL(req.url());
  248 |     let host: string;
  249 |     try {
  250 |       host = new URL(page.url()).host;
  251 |     } catch {
  252 |       host = "localhost:3000";
  253 |     }
  254 |     if (u.host !== host) return;
  255 |     failed.push({ url: req.url(), status: 0, method: req.method() });
  256 |   });
  257 |   page.on("response", (res) => {
  258 |     if (res.status() >= 400 && res.status() !== 404) {
  259 |       if (res.url().startsWith(page.url())) return;
  260 |       failed.push({
  261 |         url: res.url(),
  262 |         status: res.status(),
  263 |         method: res.request().method(),
  264 |       });
  265 |     }
  266 |   });
  267 |   page.on("dialog", (dialog) => {
  268 |     dialogText = `${dialog.type()}: ${dialog.message()}`.slice(0, 200);
  269 |     dialog.dismiss().catch(() => {});
  270 |   });
  271 |   page.on("crash", () => {
  272 |     crashed = true;
  273 |   });
  274 | 
  275 |   try {
  276 |     await page.goto(routeUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
  277 |     const locator = page.locator(probe.selector).first();
  278 |     // Some elements register but become non-visible after hydration —
  279 |     // probe-vs-click race. Skip silently.
  280 |     const isVisible = await locator.isVisible({ timeout: 1500 }).catch(() => false);
  281 |     if (!isVisible) {
  282 |       await page.close();
  283 |       return local;
  284 |     }
  285 |     // Click; capture if it throws. Use `force: false` so we honor real
  286 |     // pointer rules. trial:false (default) — actually dispatch.
  287 |     await locator.click({ timeout: 5_000, noWaitAfter: true });
  288 |   } catch (err) {
  289 |     threw = err as Error;
  290 |   }
  291 | 
> 292 |   // Give handlers a beat to fire — fetch calls, dialogs, route changes
      |              ^ Error: page.waitForTimeout: Test timeout of 180000ms exceeded.
  293 |   await page.waitForTimeout(CLICK_OBSERVE_MS);
  294 | 
  295 |   const landed = page.url();
  296 |   let landedStatus: number | null = null;
  297 |   if (landed !== routeUrl && landed.startsWith("http")) {
  298 |     // We navigated. Use HEAD-equivalent fetch to capture the landed URL's
  299 |     // status. (Page.goto already followed redirects, so we re-fetch raw.)
  300 |     try {
  301 |       const u = new URL(landed);
  302 |       const res = await page.request.get(u.pathname + u.search, {
  303 |         maxRedirects: 0,
  304 |         failOnStatusCode: false,
  305 |         timeout: 5_000,
  306 |       });
  307 |       landedStatus = res.status();
  308 |     } catch {
  309 |       // ignore — page-level findings will catch crashes
  310 |     }
  311 |   }
  312 | 
  313 |   if (crashed) {
  314 |     local.push({
  315 |       url: routeUrl,
  316 |       selector: probe.selector,
  317 |       text: probe.text,
  318 |       kind: "page_crash",
  319 |       severity: "high",
  320 |       evidence: `Click crashed renderer. Target: ${landed}`,
  321 |     });
  322 |   }
  323 | 
  324 |   if (threw) {
  325 |     local.push({
  326 |       url: routeUrl,
  327 |       selector: probe.selector,
  328 |       text: probe.text,
  329 |       kind: "click_threw",
  330 |       severity: "med",
  331 |       evidence: threw.message.slice(0, 200),
  332 |     });
  333 |   }
  334 | 
  335 |   if (!probe.text || probe.text.length === 0) {
  336 |     local.push({
  337 |       url: routeUrl,
  338 |       selector: probe.selector,
  339 |       text: "(empty)",
  340 |       kind: "empty_accessible_name",
  341 |       severity: "med",
  342 |       evidence: `${probe.tagRole} has no aria-label / title / text — screen readers will announce it as just its tag`,
  343 |     });
  344 |   }
  345 | 
  346 |   for (const ce of consoleErrors) {
  347 |     local.push({
  348 |       url: routeUrl,
  349 |       selector: probe.selector,
  350 |       text: probe.text,
  351 |       kind: "console_error_on_click",
  352 |       severity: "med",
  353 |       evidence: ce.slice(0, 300),
  354 |     });
  355 |   }
  356 | 
  357 |   for (const fr of failed) {
  358 |     local.push({
  359 |       url: routeUrl,
  360 |       selector: probe.selector,
  361 |       text: probe.text,
  362 |       kind: "failed_request_on_click",
  363 |       severity: fr.status >= 500 ? "high" : "med",
  364 |       evidence: `${fr.method} ${fr.url} → ${fr.status || "network failure"}`,
  365 |     });
  366 |   }
  367 | 
  368 |   if (dialogText) {
  369 |     local.push({
  370 |       url: routeUrl,
  371 |       selector: probe.selector,
  372 |       text: probe.text,
  373 |       kind: "unhandled_dialog",
  374 |       severity: "low",
  375 |       evidence: dialogText,
  376 |     });
  377 |   }
  378 | 
  379 |   if (landedStatus !== null) {
  380 |     if (landedStatus >= 500) {
  381 |       local.push({
  382 |         url: routeUrl,
  383 |         selector: probe.selector,
  384 |         text: probe.text,
  385 |         kind: "navigated_to_5xx",
  386 |         severity: "high",
  387 |         evidence: `click navigated to ${landed} (HTTP ${landedStatus})`,
  388 |       });
  389 |     } else if (landedStatus === 404) {
  390 |       local.push({
  391 |         url: routeUrl,
  392 |         selector: probe.selector,
```