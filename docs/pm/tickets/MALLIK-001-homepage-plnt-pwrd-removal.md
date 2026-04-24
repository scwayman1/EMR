# MALLIK-001 — Homepage: remove PLNT PWRD card, move POTENCY 710 to Partner Brands

- **Reporter:** Dr. Patel
- **Owner:** Mallik
- **Status:** ready
- **Priority:** P2 (cosmetic, partner-brand hygiene)

## User story

As a visitor to the Leafjourney homepage, I should not see the PLNT PWRD Collection promoted in the product rail, and POTENCY 710 should show up in the "Trusted by leading cannabis wellness brands" row rather than in the product rail — so the homepage reflects the current partner lineup Dr. Patel wants visible.

## Scope

**In scope**

- Remove the "AULV · EDIBLES — PLNT PWRD Collection" product card (the one marked POPULAR, $29.99) from the homepage product rail.
- Move POTENCY 710 out of its product-card position and add it as a brand entry in the Partner Brands strip, alongside PhytoRx, Flower Powered, AULV.
- Net effect on the homepage: Gold Skin Serum card stays; PLNT PWRD card goes away; Partner Brands row gains POTENCY 710.

**Out of scope**

- Deleting the PLNT PWRD product from the catalog / database
- Redirects or PDP changes (see open question below)
- Redesigning the Partner Brands strip

## Acceptance criteria

- [ ] Homepage renders without the PLNT PWRD Collection card in the product rail
- [ ] POTENCY 710 appears in the Partner Brands strip, styled consistently with existing entries (PhytoRx, Flower Powered, AULV)
- [ ] No layout regression on mobile (the screenshots are from a mobile browser)
- [ ] Lighthouse / a11y pass unchanged vs. before

## Open questions

- Does the PLNT PWRD PDP (product detail page) stay reachable at its direct URL, or should it 404? (Need a call from Dr. Patel before eng starts — it affects whether we just drop the card vs. also unpublish the product.)

## References

- Screenshots annotated by Dr. Patel (red X on PLNT PWRD card, POTENCY 710 circled in header, arrow to Partner Brands row)
- Screens as seen on `leafjourney.com` homepage (iOS Safari)
