# Marketplace Take Rate & Vendor Pricing Policy

> **Source of truth.** Code constants live in [`src/lib/marketplace/take-rate.ts`](../../src/lib/marketplace/take-rate.ts).
> Vendor-facing one-pager lives in [Linear: Vendor Partnership One-Pager](https://linear.app/emr-project/document/vendor-partnership-one-pager-draft-v1-0f2cba6bdf50).
> Authority: EMR-225. Updated 2026-04-25.

## Tiers

### Hemp / CBD wellness products *(under 0.3% Δ9-THC)*

| Tier | Take rate | Eligibility |
| --- | --- | --- |
| Founding Partner | **10%** | First 10 brands. Locked for 24 months from sign-date. |
| Growth | **12%** | Auto-applies once cumulative GMV ≥ $50,000 |
| Standard | **15%** | Default for new partners after the founding cohort closes |

### Licensed cannabis dispensary products

| Bracket | Take rate |
| --- | --- |
| Dispensary Partner | **5–8%** (negotiated per partner; default 6.5%) |

Dispensary band reflects 280E tax burden + ACH-only routing (Visa/MC prohibit licensed cannabis at the network level).

### Sponsored placement *(separate revenue line)*

Not bundled into take rate. Auction or flat-fee model. Includes featured carousel slots, condition-specific placement, "Dr. Patel Recommended" badge (subject to editorial review). Pricing published separately. Opt-in.

## What's included in the take rate

- Payment processing (3–5% absorbed inside the headline take rate so vendors see one number)
- Checkout infrastructure
- Platform hosting
- First-line customer service for 14 days post-purchase
- Dispute handling
- Compliance tooling (COA tracking, FDA claim screening)

## Reserve policy

| Vendor type | Reserve | Hold |
| --- | --- | --- |
| Hemp | 10% of gross | 14 days |
| Dispensary | 5% of gross | 14 days |

Disclosed up-front. No surprise holds.

## Payout schedule

- Weekly (Monday for prior Sunday–Saturday). Bi-weekly available on request.
- Minimum payout $25; sub-$25 amounts roll forward.
- Every payout statement shows: **Gross → Take Rate → Processing → Reserve → Net**. No black boxes.

## Founding partner contract shape

- `foundingPartnerFlag = true`
- `foundingPartnerExpiresAt = sign-date + 24 months`
- Rate locked at 10% even if standard rates change
- 90-day notice + opt-out with no penalty if global pricing changes

## Per-vendor overrides

The `vendor` row carries every economic field as a column (`takeRatePct`, `reservePct`, `reserveDays`, `payoutSchedule`). The policy in [`take-rate.ts`](../../src/lib/marketplace/take-rate.ts) supplies tier defaults; an explicit value on the vendor record always wins. This is how dispensary partners get their negotiated 5–8% rate and how legacy founding partners stay at 10% after the cohort closes.

## Worked example (Founding Partner, $40 hemp tincture)

| Line | Amount |
| --- | --- |
| Gross sale | $40.00 |
| Marketplace take (10%) | –$4.00 |
| Payabli processing | –$0.00 *(absorbed in take)* |
| Reserve (10%, released in 14 days) | –$4.00 |
| **Net this week** | **$32.00** |
| Reserve released from 14 days ago | +$4.00 |
| **Steady-state weekly payout per $40 sold** | **$36.00 (≈ 90%)** |

## Status of EMR-225 deliverables

- [x] Take rate configurable per vendor at DB level — `vendor.takeRatePct` (and `reservePct`, `reserveDays`, `payoutSchedule`).
- [x] Founding partner flag with expiration — `vendor.foundingPartnerFlag`, `foundingPartnerExpiresAt`.
- [x] Vendor pricing one-pager — Linear doc above (Draft v1; pending legal counsel sign-off).
- [x] Code constants centralized — `src/lib/marketplace/take-rate.ts`.
- [ ] Volume tier auto-promotion — needs a payout-cron hook that compares cumulative GMV to `VOLUME_TIER_GMV_THRESHOLD_USD` and updates `vendor.takeRatePct`. Folded into EMR-254 (Weekly Payout Cron).
- [ ] Payout statement breakdown UI — folded into EMR-255 (Payout Statement PDF Generator); the generator will call `computePayoutLineItems()` from this module.
- [ ] Admin override UI — vendor portal scope, EMR-251.
- [ ] Finance team sign-off — pending.
