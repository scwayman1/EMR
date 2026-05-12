# Link integrity — 2026-05-12

Pass 6: crawled 17 seed pages, harvested every 
internal `<a href>`, probed each unique target. Captured by
`e2e/link-integrity.spec.ts`.

**17 broken links** across **1 unique URLs**.

| Category | Count |
|---|---|
| 404 (real bug) | 0 |
| 5xx (real bug) | 0 |
| dev_cache (stale .next — `rm -rf .next && npm run dev`) | 0 |
| other / network | 17 |

## By target

### OTHER (17)

- `(could not load seed page)` → 0 — linked from: `/`, `/about`, `/about/team`, `/about/business`, `/features`, `/security`, `/contact`, `/book-demo`, `/education`, `/leafmart`, `/leafmart/shop`, `/store`, `/marketplace`, `/foundation`, `/status`, `/licensing`, `/legal/terms`
