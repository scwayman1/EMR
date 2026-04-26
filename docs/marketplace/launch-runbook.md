# Marketplace Launch Runbook & Go/No-Go Checklist

> **Purpose:** the gate between "internal testing" and "accepting real money from real patients." No item gets a check until it's verified by the named owner. **Launch does not proceed until every checklist item is green.**
>
> Authority: EMR-263. Owner of the launch decision: **Scott Wayman**.
> Target launch window: TBD (post Week 4 milestone).
> Last updated: 2026-04-25.

## How to use this doc

1. Each item has an **owner** (responsible) and a **target date**.
2. To check an item, the owner replaces `- [ ]` with `- [x]` *and* adds `(verified <YYYY-MM-DD>, <name>)` inline.
3. Anything left unchecked **at launch time** blocks launch — no exceptions, no "we'll fix it after."
4. Add a row to the **Verification log** at the bottom for each item flipped green.

The expected cadence: 1 hour per Friday for 4 weeks, owner-by-owner walkthrough, until the doc is fully green.

---

## 1. Payments

| Owner | Item | Target | Status |
| --- | --- | --- | --- |
| Scott | Payabli production approval received (not just sandbox) | EMR-232 → live | - [ ] |
| Scott | Production API keys present in env (not committed to repo) | EMR-232 | - [ ] |
| Scott | Hemp Pay Point live in production | EMR-227 | - [ ] |
| Scott | Test charge to a real personal card succeeds end-to-end (cart → checkout → confirmation email → vendor sees order) | EMR-234 | - [ ] |
| Scott | Reconciliation report runs clean for **7 consecutive days** in production | EMR-236 | - [ ] |

## 2. Compliance

| Owner | Item | Target | Status |
| --- | --- | --- | --- |
| Outside counsel + Scott | All 5 legal pages reviewed and signed off by counsel (ToS, Privacy, Shipping, Returns, Disputes) | EMR-258 | - [ ] |
| Vendors + Scott | Current COA on file for **every** live cannabinoid product (no exceptions, no expired) | EMR-242 | - [ ] |
| Scott | FDA claim screening enforced at listing time (auto-flag prohibited terms; tested with positive + negative cases) | downstream of EMR-251 | - [ ] |
| Scott | 21+ age gate tested on PDP and cart for all `requires_21_plus=true` products | EMR-245 | - [ ] |
| Scott | State shipping restrictions tested — attempting NY-restricted product to NY blocks at add-to-cart with clear messaging | EMR-244 | - [ ] |
| Scott | Privacy policy + ToS acceptance enforced at checkout (cannot complete purchase without checking the box) | EMR-258 | - [ ] |

## 3. Operations

| Owner | Item | Target | Status |
| --- | --- | --- | --- |
| Scott | First-line customer service inbox monitored (`scott@` or `support@`) with documented SLA | — | - [ ] |
| Scott | Refund workflow tested with a real (low-value) production transaction end-to-end | EMR-260 | - [ ] |
| Scott | Chargeback evidence submission tested via Payabli sandbox dispute (ensures we know how the form works before the first real one fires) | EMR-256 | - [ ] |
| Scott | Admin god view accessible + functional (can find any order, vendor, or refund) | downstream of EMR-228 | - [ ] |

## 4. Vendors

| Owner | Item | Target | Status |
| --- | --- | --- | --- |
| Scott | At least **5 vendors** onboarded with status=`active` | EMR-226 | - [ ] |
| Scott | Vendor agreements signed (countersigned PDF stored against the Vendor record) | EMR-225 | - [ ] |
| Scott | W-9 on file for every active vendor | EMR-241 | - [ ] |
| Scott | Each active vendor has **≥ 3 published products** | EMR-251 | - [ ] |
| Vendor leads | Each vendor has tested their own fulfillment flow (placed a test order against themselves and shipped it) | EMR-253 | - [ ] |

## 5. Patients

| Owner | Item | Target | Status |
| --- | --- | --- | --- |
| Scott | Buyer can complete purchase end-to-end: discover → PDP → cart → checkout → payment → confirmation | EMR-234, EMR-265, EMR-266 | - [ ] |
| Scott | Confirmation email lands in primary inbox (Gmail, Outlook, iCloud) — not spam | EMR-246 | - [ ] |
| Scott | Order status page accessible to logged-in patient and via signed time-limited URL for guest checkout | EMR-259 | - [ ] |
| Scott | Refund request flow works from the patient side (button → reason → submit → confirmation) | EMR-260 | - [ ] |

## 6. Go / No-Go criteria

The launch decision is a single meeting. Go requires all of:

- [ ] Every checklist item above is green with verification log entries.
- [ ] **Dr. Patel approval** on clinical adjacency (the marketplace is a physician-endorsed product surface; she signs off that the catalog at launch is one she would recommend).
- [ ] Scott + Lucca + at least **one outside user** (friend / family buyer) have completed a full purchase in production.
- [ ] No P0 / P1 issues open in Linear under the `Launch Readiness` label.

If any "Go" criterion is missing, launch is **No-Go** and a new target date is set. No partial launches.

## 7. Day-of-launch sequence

1. **T–24h:** final smoke test in production (Scott).
2. **T–4h:** flip the marketing site CTAs from "Join the waitlist" to "Shop now" — but only on staging. Verify links resolve.
3. **T–0:** flip the marketing site live. Post launch announcement.
4. **T+1h:** Scott monitors Sentry, Payabli dashboard, support inbox simultaneously for 1 hour.
5. **T+24h:** post-launch review meeting (Scott, Lucca, Dr. Patel). Confirmed checklist of issues found, owners assigned, target fix dates.
6. **T+7d:** reconciliation health check — first weekly payout cron runs successfully without manual intervention.

## 8. Rollback criteria

If during launch we observe **any** of the following, we kill the marketing CTA and revert to waitlist mode:

- A real chargeback or fraud event we cannot identify the root cause of within 4 hours.
- Reconciliation discrepancy between Payabli and our ledger > $25 in any single day.
- Confirmation email bounce rate > 5% (suggests spoofing / SPF / DKIM issue).
- Order processing latency > 30 seconds at the 95th percentile.
- A vendor reports they cannot fulfill an order they accepted.

Rolling back is not a failure — shipping a broken payments flow is.

## 9. Verification log

| Date | Item | Owner | Notes |
| --- | --- | --- | --- |
| _Empty until first item is verified._ | | | |

---

## Appendix A: dependency map by ticket

```
EMR-263 (this runbook)
├── Payments    → EMR-227, EMR-232, EMR-234, EMR-236
├── Compliance  → EMR-242, EMR-244, EMR-245, EMR-251, EMR-258
├── Operations  → EMR-228, EMR-256, EMR-260
├── Vendors     → EMR-225, EMR-226, EMR-241, EMR-251, EMR-253
└── Patients    → EMR-234, EMR-246, EMR-259, EMR-260, EMR-265, EMR-266
```

## Appendix B: contact tree

- **Launch decision owner:** Scott Wayman (`scott@leafjourney.[tbd]`)
- **Clinical sign-off:** Dr. Patel
- **Legal:** outside counsel (TBD; engagement letter required before EMR-258 can be checked)
- **Finance / take-rate sign-off:** TBD
- **First responders day-of:** Scott + Lucca
