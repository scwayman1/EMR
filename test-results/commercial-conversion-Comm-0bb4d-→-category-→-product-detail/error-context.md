# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: commercial-conversion.spec.ts >> Commercial conversion smoke — pass 9 >> landing → leafmart shop → category → product detail
- Location: e2e/commercial-conversion.spec.ts:125:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('a[href^="/leafmart/category/"]').first()
    - locator resolved to <a href="/leafmart/category/rest" class="hover:text-[var(--leaf)] transition-colors">Rest</a>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <button type="button" tabindex="-1" aria-label="Dismiss age confirmation" class="absolute inset-0 bg-[var(--ink)]/35 backdrop-blur-md cursor-default animate-in fade-in duration-300"></button> from <div role="dialog" aria-modal="true" aria-labelledby=":r0:" aria-describedby=":r1:" class="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 sm:py-12">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <button type="button" tabindex="-1" aria-label="Dismiss age confirmation" class="absolute inset-0 bg-[var(--ink)]/35 backdrop-blur-md cursor-default animate-in fade-in duration-300"></button> from <div role="dialog" aria-modal="true" aria-labelledby=":r0:" aria-describedby=":r1:" class="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 sm:py-12">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    47 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <button type="button" tabindex="-1" aria-label="Dismiss age confirmation" class="absolute inset-0 bg-[var(--ink)]/35 backdrop-blur-md cursor-default animate-in fade-in duration-300"></button> from <div role="dialog" aria-modal="true" aria-labelledby=":r0:" aria-describedby=":r1:" class="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 sm:py-12">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - link "Skip to content" [ref=e3] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e4]:
    - banner [ref=e5]:
      - navigation "Main" [ref=e6]:
        - link "Leafmart home" [ref=e7] [cursor=pointer]:
          - /url: /leafmart
          - img [ref=e8]
          - generic [ref=e12]: "|"
          - generic [ref=e13]:
            - img [ref=e14]
            - generic [ref=e17]: Leafmart
        - generic [ref=e18]:
          - link "Rest" [ref=e19] [cursor=pointer]:
            - /url: /leafmart/category/rest
          - link "Relief" [ref=e20] [cursor=pointer]:
            - /url: /leafmart/category/relief
          - link "Calm" [ref=e21] [cursor=pointer]:
            - /url: /leafmart/category/calm
          - link "Skin" [ref=e22] [cursor=pointer]:
            - /url: /leafmart/category/skin
          - link "Focus" [ref=e23] [cursor=pointer]:
            - /url: /leafmart/category/focus
          - generic [ref=e24]: "|"
          - link "The Method" [ref=e25] [cursor=pointer]:
            - /url: /leafmart/about
          - link "Vendors" [ref=e26] [cursor=pointer]:
            - /url: /leafmart/vendors
          - link "Education" [ref=e27] [cursor=pointer]:
            - /url: /education
          - link "Advocacy" [ref=e28] [cursor=pointer]:
            - /url: /advocacy
        - generic [ref=e29]:
          - link "Sign in" [ref=e30] [cursor=pointer]:
            - /url: /leafmart/login
          - button "Switch to dark theme" [ref=e31] [cursor=pointer]:
            - img [ref=e32]
            - img [ref=e39]
          - button "Open cart" [ref=e41] [cursor=pointer]:
            - img [ref=e42]
          - link "Take the quiz" [ref=e45] [cursor=pointer]:
            - /url: /leafmart/quiz
    - main [ref=e46]:
      - generic [ref=e48]:
        - generic [ref=e49]:
          - generic [ref=e50]: Join 12,000+ Leafmart members
          - heading "Cannabis wellness, doctor-guided." [level=1] [ref=e52]:
            - text: Cannabis wellness,
            - emphasis [ref=e53]: doctor-guided.
          - paragraph [ref=e54]: Every product on Leafmart is reviewed by a licensed clinician, verified by a third-party lab, and ranked by what actually helped people like you. No dispensary energy. No guesswork.
          - generic [ref=e55]:
            - link "Find what helps →" [ref=e56] [cursor=pointer]:
              - /url: /leafmart/shop
            - link "How we vet products" [ref=e57] [cursor=pointer]:
              - /url: /leafmart/about
          - generic [ref=e58]:
            - generic [ref=e59]:
              - img [ref=e60]
              - text: Physician Curated
            - generic [ref=e63]:
              - img [ref=e64]
              - text: Lab Verified
            - generic [ref=e67]:
              - img [ref=e68]
              - text: Outcome Informed
        - generic [ref=e71]:
          - img [ref=e74]
          - generic [ref=e82]:
            - generic [ref=e83]:
              - generic [ref=e84]: NP
              - generic [ref=e85]:
                - generic [ref=e86]: Dr. N.H. Patel, DO
                - generic [ref=e87]: Medical Lead, Leafjourney
            - generic [ref=e88]: “I read the lab on every product before it hits the shelf. The shelf is short on purpose.”
          - generic [ref=e89]:
            - generic [ref=e90]: 81%
            - generic [ref=e91]:
              - generic [ref=e92]: reported better sleep
              - generic [ref=e93]: n = 612 patients · last 90d
      - generic [ref=e95]:
        - generic [ref=e97]:
          - generic:
            - img
          - searchbox "Search Leafmart" [ref=e98]
          - button "Search" [ref=e99] [cursor=pointer]
        - paragraph [ref=e100]: Try “sleep”, “CBD tincture”, “limonene”, or a brand name. We'll surface products, symptoms, terpenes, and more.
      - generic [ref=e101]:
        - generic [ref=e102]:
          - generic [ref=e103]:
            - paragraph [ref=e104]: Find what helps
            - heading "Start with how you want to feel." [level=2] [ref=e105]:
              - text: Start with how you
              - emphasis [ref=e106]: want to feel
              - text: .
          - link "See all shelves →" [ref=e107] [cursor=pointer]:
            - /url: /leafmart/shop
        - generic [ref=e108]:
          - link "Anxiety Calming formulations for stress and anxious moments. 6 products" [ref=e109] [cursor=pointer]:
            - /url: /leafmart/category/anxiety
            - generic [ref=e110]:
              - generic [ref=e111]:
                - heading "Anxiety" [level=3] [ref=e112]
                - paragraph [ref=e113]: Calming formulations for stress and anxious moments.
              - img [ref=e115]
            - generic [ref=e118]: 6 products
            - img [ref=e123]
          - link "Beginner Friendly Low-dose, gentle formulations for new patients. 9 products" [ref=e131] [cursor=pointer]:
            - /url: /leafmart/category/beginner-friendly
            - generic [ref=e132]:
              - generic [ref=e133]:
                - heading "Beginner Friendly" [level=3] [ref=e134]
                - paragraph [ref=e135]: Low-dose, gentle formulations for new patients.
              - img [ref=e137]
            - generic [ref=e141]: 9 products
            - img [ref=e146]
          - link "Best Sellers Our most trusted and reordered products. 7 products" [ref=e154] [cursor=pointer]:
            - /url: /leafmart/category/best-sellers
            - generic [ref=e155]:
              - generic [ref=e156]:
                - heading "Best Sellers" [level=3] [ref=e157]
                - paragraph [ref=e158]: Our most trusted and reordered products.
              - img [ref=e160]
            - generic [ref=e162]: 7 products
            - img [ref=e167]:
              - generic [ref=e172]: still
          - link "Calm Gentle relaxation without heavy sedation. 10 products" [ref=e176] [cursor=pointer]:
            - /url: /leafmart/category/calm
            - generic [ref=e177]:
              - generic [ref=e178]:
                - heading "Calm" [level=3] [ref=e179]
                - paragraph [ref=e180]: Gentle relaxation without heavy sedation.
              - img [ref=e182]
            - generic [ref=e186]: 10 products
            - img [ref=e191]
          - link "Capsules Consistent dosing in familiar form. 4 products" [ref=e199] [cursor=pointer]:
            - /url: /leafmart/category/capsules
            - generic [ref=e200]:
              - generic [ref=e201]:
                - heading "Capsules" [level=3] [ref=e202]
                - paragraph [ref=e203]: Consistent dosing in familiar form.
              - img [ref=e205]
            - generic [ref=e209]: 4 products
            - img [ref=e214]
          - link "Clinician Picks Selected by our care team for quality and efficacy. 8 products" [ref=e222] [cursor=pointer]:
            - /url: /leafmart/category/clinician-picks
            - generic [ref=e223]:
              - generic [ref=e224]:
                - heading "Clinician Picks" [level=3] [ref=e225]
                - paragraph [ref=e226]: Selected by our care team for quality and efficacy.
              - img [ref=e228]
            - generic [ref=e232]: 8 products
            - img [ref=e237]
          - link "Edibles Measured-dose edible formulations. 5 products" [ref=e245] [cursor=pointer]:
            - /url: /leafmart/category/edibles
            - generic [ref=e246]:
              - generic [ref=e247]:
                - heading "Edibles" [level=3] [ref=e248]
                - paragraph [ref=e249]: Measured-dose edible formulations.
              - img [ref=e251]
            - generic [ref=e254]: 5 products
            - img [ref=e259]:
              - generic [ref=e262]: edibles
          - link "Energy Uplifting formulations for daytime vitality. 3 products" [ref=e266] [cursor=pointer]:
            - /url: /leafmart/category/energy
            - generic [ref=e267]:
              - generic [ref=e268]:
                - heading "Energy" [level=3] [ref=e269]
                - paragraph [ref=e270]: Uplifting formulations for daytime vitality.
              - img [ref=e272]
            - generic [ref=e279]: 3 products
            - img [ref=e284]:
              - generic [ref=e289]: still
          - link "Focus Clarity and concentration support. 4 products" [ref=e293] [cursor=pointer]:
            - /url: /leafmart/category/focus
            - generic [ref=e294]:
              - generic [ref=e295]:
                - heading "Focus" [level=3] [ref=e296]
                - paragraph [ref=e297]: Clarity and concentration support.
              - img [ref=e299]
            - generic [ref=e303]: 4 products
            - img [ref=e308]:
              - generic [ref=e311]: edibles
          - link "Nausea Fast-acting support for nausea and appetite. 2 products" [ref=e315] [cursor=pointer]:
            - /url: /leafmart/category/nausea
            - generic [ref=e316]:
              - generic [ref=e317]:
                - heading "Nausea" [level=3] [ref=e318]
                - paragraph [ref=e319]: Fast-acting support for nausea and appetite.
              - img [ref=e321]
            - generic [ref=e326]: 2 products
            - img [ref=e331]:
              - generic [ref=e336]: still
          - link "Pain Support Targeted relief for chronic and acute discomfort. 6 products" [ref=e340] [cursor=pointer]:
            - /url: /leafmart/category/pain-support
            - generic [ref=e341]:
              - generic [ref=e342]:
                - heading "Pain Support" [level=3] [ref=e343]
                - paragraph [ref=e344]: Targeted relief for chronic and acute discomfort.
              - img [ref=e346]
            - generic [ref=e351]: 6 products
            - img [ref=e356]:
              - generic [ref=e361]: field balm № 4
          - link "Relief Post-activity and inflammation support — cannabinoid relief for body and mind. 8 products" [ref=e362] [cursor=pointer]:
            - /url: /leafmart/category/relief
            - generic [ref=e363]:
              - generic [ref=e364]:
                - heading "Relief" [level=3] [ref=e365]
                - paragraph [ref=e366]: Post-activity and inflammation support — cannabinoid relief for body and mind.
              - img [ref=e368]
            - generic [ref=e370]: 8 products
            - img [ref=e375]:
              - generic [ref=e380]: field balm № 4
          - link "Rest Formulations chosen to support evening wind-down and restful routines. 1 product" [ref=e381] [cursor=pointer]:
            - /url: /leafmart/category/rest
            - generic [ref=e382]:
              - generic [ref=e383]:
                - heading "Rest" [level=3] [ref=e384]
                - paragraph [ref=e385]: Formulations chosen to support evening wind-down and restful routines.
              - img [ref=e387]
            - generic [ref=e389]: 1 product
            - img [ref=e394]:
              - generic [ref=e399]: still
          - link "Skin Plant-powered skin recovery and barrier support. 4 products" [ref=e403] [cursor=pointer]:
            - /url: /leafmart/category/skin
            - generic [ref=e404]:
              - generic [ref=e405]:
                - heading "Skin" [level=3] [ref=e406]
                - paragraph [ref=e407]: Plant-powered skin recovery and barrier support.
              - img [ref=e409]
            - generic [ref=e413]: 4 products
            - img [ref=e418]:
              - generic [ref=e423]: gold
              - generic [ref=e424]: serum
          - link "Tinctures Precise sublingual dosing. 7 products" [ref=e425] [cursor=pointer]:
            - /url: /leafmart/category/tinctures
            - generic [ref=e426]:
              - generic [ref=e427]:
                - heading "Tinctures" [level=3] [ref=e428]
                - paragraph [ref=e429]: Precise sublingual dosing.
              - img [ref=e431]
            - generic [ref=e435]: 7 products
            - img [ref=e440]
          - link "Topicals Targeted external application. 10 products" [ref=e448] [cursor=pointer]:
            - /url: /leafmart/category/topicals
            - generic [ref=e449]:
              - generic [ref=e450]:
                - heading "Topicals" [level=3] [ref=e451]
                - paragraph [ref=e452]: Targeted external application.
              - img [ref=e454]
            - generic [ref=e457]: 10 products
            - img [ref=e462]:
              - generic [ref=e467]: field balm № 4
          - link "Vaporizers Fast-onset inhalation. 2 products" [ref=e468] [cursor=pointer]:
            - /url: /leafmart/category/vaporizers
            - generic [ref=e469]:
              - generic [ref=e470]:
                - heading "Vaporizers" [level=3] [ref=e471]
                - paragraph [ref=e472]: Fast-onset inhalation.
              - img [ref=e474]
            - generic [ref=e479]: 2 products
            - img [ref=e484]
      - generic [ref=e491]:
        - generic [ref=e492]:
          - generic [ref=e493]:
            - paragraph [ref=e494]: The Rest Shelf
            - heading "For the hour before bed." [level=2] [ref=e495]:
              - text: For the hour
              - emphasis [ref=e496]: before bed
              - text: .
            - paragraph [ref=e497]: Reviewed in the last six months. Sorted by what people with a similar evening routine told us actually helped.
          - link "See the whole shelf →" [ref=e498] [cursor=pointer]:
            - /url: /leafmart/category/rest
        - generic [ref=e500]:
          - link "New COA PHYTORX · Tincture · CBD Clear Mornings Tincture A daytime CBG-forward tincture for the pre-coffee window. 30 mL · 500mg CBG 70% helped · n=112 $58 Add Clear Mornings Tincture to cart" [ref=e501] [cursor=pointer]:
            - /url: /leafmart/products/clear-mornings-tincture
            - generic [ref=e502]:
              - img [ref=e505]
              - generic [ref=e513]: New
              - generic [ref=e515]:
                - img [ref=e516]
                - text: COA
            - generic [ref=e519]:
              - paragraph [ref=e520]: PHYTORX · Tincture · CBD
              - heading "Clear Mornings Tincture" [level=4] [ref=e521]
              - paragraph [ref=e522]: A daytime CBG-forward tincture for the pre-coffee window.
              - generic [ref=e523]:
                - generic [ref=e524]:
                  - generic [ref=e525]: 30 mL · 500mg CBG
                  - generic [ref=e526]: 70% helped · n=112
                - generic [ref=e528]:
                  - generic [ref=e529]: $58
                  - button "Add Clear Mornings Tincture to cart" [ref=e530]:
                    - img [ref=e531]
          - link "New COA POTENCY 710 · Topical · CBD Petal Cleanser Gel cleanser with 50mg CBD and rose water. 6oz · 50mg 67% helped · n=78 $32 Add Petal Cleanser to cart" [ref=e535] [cursor=pointer]:
            - /url: /leafmart/products/petal-cleanser
            - generic [ref=e536]:
              - img [ref=e539]
              - generic [ref=e547]: New
              - generic [ref=e549]:
                - img [ref=e550]
                - text: COA
            - generic [ref=e553]:
              - paragraph [ref=e554]: POTENCY 710 · Topical · CBD
              - heading "Petal Cleanser" [level=4] [ref=e555]
              - paragraph [ref=e556]: Gel cleanser with 50mg CBD and rose water.
              - generic [ref=e557]:
                - generic [ref=e558]:
                  - generic [ref=e559]: 6oz · 50mg
                  - generic [ref=e560]: 67% helped · n=78
                - generic [ref=e562]:
                  - generic [ref=e563]: $32
                  - button "Add Petal Cleanser to cart" [ref=e564]:
                    - img [ref=e565]
          - link "New COA POTENCY 710 · Topical · CBD Bloom Body Lotion A lightweight everyday lotion with 500mg CBD and shea. 8oz · 500mg 70% helped · n=102 $38 Add Bloom Body Lotion to cart" [ref=e569] [cursor=pointer]:
            - /url: /leafmart/products/bloom-body-lotion
            - generic [ref=e570]:
              - img [ref=e573]
              - generic [ref=e581]: New
              - generic [ref=e583]:
                - img [ref=e584]
                - text: COA
            - generic [ref=e587]:
              - paragraph [ref=e588]: POTENCY 710 · Topical · CBD
              - heading "Bloom Body Lotion" [level=4] [ref=e589]
              - paragraph [ref=e590]: A lightweight everyday lotion with 500mg CBD and shea.
              - generic [ref=e591]:
                - generic [ref=e592]:
                  - generic [ref=e593]: 8oz · 500mg
                  - generic [ref=e594]: 70% helped · n=102
                - generic [ref=e596]:
                  - generic [ref=e597]: $38
                  - button "Add Bloom Body Lotion to cart" [ref=e598]:
                    - img [ref=e599]
          - link "New COA POTENCY 710 · Serum · CBD Renewal Face Oil Cold-pressed rosehip + jojoba with 100mg full-spectrum CBD. 30 mL · 100mg 71% helped · n=134 $68 Add Renewal Face Oil to cart" [ref=e603] [cursor=pointer]:
            - /url: /leafmart/products/renewal-face-oil
            - generic [ref=e604]:
              - img [ref=e607]:
                - generic [ref=e612]: gold
                - generic [ref=e613]: serum
              - generic [ref=e614]: New
              - generic [ref=e616]:
                - img [ref=e617]
                - text: COA
            - generic [ref=e620]:
              - paragraph [ref=e621]: POTENCY 710 · Serum · CBD
              - heading "Renewal Face Oil" [level=4] [ref=e622]
              - paragraph [ref=e623]: Cold-pressed rosehip + jojoba with 100mg full-spectrum CBD.
              - generic [ref=e624]:
                - generic [ref=e625]:
                  - generic [ref=e626]: 30 mL · 100mg
                  - generic [ref=e627]: 71% helped · n=134
                - generic [ref=e629]:
                  - generic [ref=e630]: $68
                  - button "Add Renewal Face Oil to cart" [ref=e631]:
                    - img [ref=e632]
          - link "Clinician Pick Clinician Pick POTENCY 710 · Serum · CBD Gold Skin Serum A clinician-reviewed serum for skin recovery and barrier support. 30 mL · 250mg 73% helped · n=218 $84 Add Gold Skin Serum to cart" [ref=e636] [cursor=pointer]:
            - /url: /leafmart/products/gold-skin-serum
            - generic [ref=e637]:
              - img [ref=e640]:
                - generic [ref=e645]: gold
                - generic [ref=e646]: serum
              - generic [ref=e647]: Clinician Pick
              - generic [ref=e649]:
                - img [ref=e650]
                - text: Clinician Pick
            - generic [ref=e652]:
              - paragraph [ref=e653]: POTENCY 710 · Serum · CBD
              - heading "Gold Skin Serum" [level=4] [ref=e654]
              - paragraph [ref=e655]: A clinician-reviewed serum for skin recovery and barrier support.
              - generic [ref=e656]:
                - generic [ref=e657]:
                  - generic [ref=e658]: 30 mL · 250mg
                  - generic [ref=e659]: 73% helped · n=218
                - generic [ref=e661]:
                  - generic [ref=e662]: $84
                  - button "Add Gold Skin Serum to cart" [ref=e663]:
                    - img [ref=e664]
          - link "New COA POTENCY 710 · Vape · CBD Pause Pen 0.5g 1:1 CBD:CBG vape with a soft citrus terpene. 0.5g · 1:1 CBD:CBG 69% helped · n=96 $42 Add Pause Pen to cart" [ref=e668] [cursor=pointer]:
            - /url: /leafmart/products/pause-pen
            - generic [ref=e669]:
              - img [ref=e672]
              - generic [ref=e680]: New
              - generic [ref=e682]:
                - img [ref=e683]
                - text: COA
            - generic [ref=e686]:
              - paragraph [ref=e687]: POTENCY 710 · Vape · CBD
              - heading "Pause Pen" [level=4] [ref=e688]
              - paragraph [ref=e689]: 0.5g 1:1 CBD:CBG vape with a soft citrus terpene.
              - generic [ref=e690]:
                - generic [ref=e691]:
                  - generic [ref=e692]: 0.5g · 1:1 CBD:CBG
                  - generic [ref=e693]: 69% helped · n=96
                - generic [ref=e695]:
                  - generic [ref=e696]: $42
                  - button "Add Pause Pen to cart" [ref=e697]:
                    - img [ref=e698]
          - link "New COA GREENLEAF CO. · Tincture · CBD Steady Drops 1000mg broad-spectrum CBD. Everyday consistency. 30 mL · 1000mg CBD 75% helped · n=248 $56 Add Steady Drops to cart" [ref=e702] [cursor=pointer]:
            - /url: /leafmart/products/steady-drops
            - generic [ref=e703]:
              - img [ref=e706]
              - generic [ref=e714]: New
              - generic [ref=e716]:
                - img [ref=e717]
                - text: COA
            - generic [ref=e720]:
              - paragraph [ref=e721]: GREENLEAF CO. · Tincture · CBD
              - heading "Steady Drops" [level=4] [ref=e722]
              - paragraph [ref=e723]: 1000mg broad-spectrum CBD. Everyday consistency.
              - generic [ref=e724]:
                - generic [ref=e725]:
                  - generic [ref=e726]: 30 mL · 1000mg CBD
                  - generic [ref=e727]: 75% helped · n=248
                - generic [ref=e729]:
                  - generic [ref=e730]: $56
                  - button "Add Steady Drops to cart" [ref=e731]:
                    - img [ref=e732]
          - link "New COA POTENCY 710 · Edible · CBD Settle Gummies Low-dose 5mg CBD gummies. Take the edge off, gently. 30 ct · 5mg ea 72% helped · n=184 $32 Add Settle Gummies to cart" [ref=e736] [cursor=pointer]:
            - /url: /leafmart/products/settle-gummies
            - generic [ref=e737]:
              - img [ref=e740]
              - generic [ref=e747]: New
              - generic [ref=e749]:
                - img [ref=e750]
                - text: COA
            - generic [ref=e753]:
              - paragraph [ref=e754]: POTENCY 710 · Edible · CBD
              - heading "Settle Gummies" [level=4] [ref=e755]
              - paragraph [ref=e756]: Low-dose 5mg CBD gummies. Take the edge off, gently.
              - generic [ref=e757]:
                - generic [ref=e758]:
                  - generic [ref=e759]: 30 ct · 5mg ea
                  - generic [ref=e760]: 72% helped · n=184
                - generic [ref=e762]:
                  - generic [ref=e763]: $32
                  - button "Add Settle Gummies to cart" [ref=e764]:
                    - img [ref=e765]
          - link "New COA PHYTORX · Beverage · CBD Hum A quiet beverage for the late-afternoon. CBD + L-theanine. 12 fl oz · CBD + L-theanine 70% helped · n=161 $28 Add Hum to cart" [ref=e769] [cursor=pointer]:
            - /url: /leafmart/products/hum-beverage
            - generic [ref=e770]:
              - img [ref=e773]:
                - generic [ref=e778]: still
              - generic [ref=e782]: New
              - generic [ref=e784]:
                - img [ref=e785]
                - text: COA
            - generic [ref=e788]:
              - paragraph [ref=e789]: PHYTORX · Beverage · CBD
              - heading "Hum" [level=4] [ref=e790]
              - paragraph [ref=e791]: A quiet beverage for the late-afternoon. CBD + L-theanine.
              - generic [ref=e792]:
                - generic [ref=e793]:
                  - generic [ref=e794]: 12 fl oz · CBD + L-theanine
                  - generic [ref=e795]: 70% helped · n=161
                - generic [ref=e797]:
                  - generic [ref=e798]: $28
                  - button "Add Hum to cart" [ref=e799]:
                    - img [ref=e800]
          - link "New COA GREENLEAF CO. · Tincture · CBD Easy Hours Tincture A daytime CBD tincture for when the day is louder than the head. 30 mL · 750mg 74% helped · n=219 $48 Add Easy Hours Tincture to cart" [ref=e804] [cursor=pointer]:
            - /url: /leafmart/products/easy-hours-tincture
            - generic [ref=e805]:
              - img [ref=e808]
              - generic [ref=e816]: New
              - generic [ref=e818]:
                - img [ref=e819]
                - text: COA
            - generic [ref=e822]:
              - paragraph [ref=e823]: GREENLEAF CO. · Tincture · CBD
              - heading "Easy Hours Tincture" [level=4] [ref=e824]
              - paragraph [ref=e825]: A daytime CBD tincture for when the day is louder than the head.
              - generic [ref=e826]:
                - generic [ref=e827]:
                  - generic [ref=e828]: 30 mL · 750mg
                  - generic [ref=e829]: 74% helped · n=219
                - generic [ref=e831]:
                  - generic [ref=e832]: $48
                  - button "Add Easy Hours Tincture to cart" [ref=e833]:
                    - img [ref=e834]
          - link "New COA FLOWER POWERED · Topical · CBD Liniment Splash Modernized herbal liniment with 600mg CBD. 8oz · 600mg 71% helped · n=88 $32 Add Liniment Splash to cart" [ref=e838] [cursor=pointer]:
            - /url: /leafmart/products/liniment-splash
            - generic [ref=e839]:
              - img [ref=e842]
              - generic [ref=e850]: New
              - generic [ref=e852]:
                - img [ref=e853]
                - text: COA
            - generic [ref=e856]:
              - paragraph [ref=e857]: FLOWER POWERED · Topical · CBD
              - heading "Liniment Splash" [level=4] [ref=e858]
              - paragraph [ref=e859]: Modernized herbal liniment with 600mg CBD.
              - generic [ref=e860]:
                - generic [ref=e861]:
                  - generic [ref=e862]: 8oz · 600mg
                  - generic [ref=e863]: 71% helped · n=88
                - generic [ref=e865]:
                  - generic [ref=e866]: $32
                  - button "Add Liniment Splash to cart" [ref=e867]:
                    - img [ref=e868]
          - link "New COA FLOWER POWERED · Topical · CBD Day After Cream A whipped 1000mg CBD cream for next-day soreness. 4oz · 1000mg 78% helped · n=168 $56 Add Day After Cream to cart" [ref=e872] [cursor=pointer]:
            - /url: /leafmart/products/day-after-cream
            - generic [ref=e873]:
              - img [ref=e876]:
                - generic [ref=e881]: field balm № 4
              - generic [ref=e882]: New
              - generic [ref=e884]:
                - img [ref=e885]
                - text: COA
            - generic [ref=e888]:
              - paragraph [ref=e889]: FLOWER POWERED · Topical · CBD
              - heading "Day After Cream" [level=4] [ref=e890]
              - paragraph [ref=e891]: A whipped 1000mg CBD cream for next-day soreness.
              - generic [ref=e892]:
                - generic [ref=e893]:
                  - generic [ref=e894]: 4oz · 1000mg
                  - generic [ref=e895]: 78% helped · n=168
                - generic [ref=e897]:
                  - generic [ref=e898]: $56
                  - button "Add Day After Cream to cart" [ref=e899]:
                    - img [ref=e900]
          - link "New COA FLOWER POWERED · Topical · CBD Mineral Bath Soak Magnesium + CBD bath soak for the full body unwind. 16oz 75% helped · n=142 $34 Add Mineral Bath Soak to cart" [ref=e904] [cursor=pointer]:
            - /url: /leafmart/products/mineral-bath-soak
            - generic [ref=e905]:
              - img [ref=e908]
              - generic [ref=e915]: New
              - generic [ref=e917]:
                - img [ref=e918]
                - text: COA
            - generic [ref=e921]:
              - paragraph [ref=e922]: FLOWER POWERED · Topical · CBD
              - heading "Mineral Bath Soak" [level=4] [ref=e923]
              - paragraph [ref=e924]: Magnesium + CBD bath soak for the full body unwind.
              - generic [ref=e925]:
                - generic [ref=e926]:
                  - generic [ref=e927]: 16oz
                  - generic [ref=e928]: 75% helped · n=142
                - generic [ref=e930]:
                  - generic [ref=e931]: $34
                  - button "Add Mineral Bath Soak to cart" [ref=e932]:
                    - img [ref=e933]
          - link "New COA FLOWER POWERED · Topical · CBD Trailhead Roll-on A 750mg roll-on for targeted spots. 3oz · 750mg 73% helped · n=196 $38 Add Trailhead Roll-on to cart" [ref=e937] [cursor=pointer]:
            - /url: /leafmart/products/trailhead-roll-on
            - generic [ref=e938]:
              - img [ref=e941]
              - generic [ref=e949]: New
              - generic [ref=e951]:
                - img [ref=e952]
                - text: COA
            - generic [ref=e955]:
              - paragraph [ref=e956]: FLOWER POWERED · Topical · CBD
              - heading "Trailhead Roll-on" [level=4] [ref=e957]
              - paragraph [ref=e958]: A 750mg roll-on for targeted spots.
              - generic [ref=e959]:
                - generic [ref=e960]:
                  - generic [ref=e961]: 3oz · 750mg
                  - generic [ref=e962]: 73% helped · n=196
                - generic [ref=e964]:
                  - generic [ref=e965]: $38
                  - button "Add Trailhead Roll-on to cart" [ref=e966]:
                    - img [ref=e967]
          - link "Clinician Pick Clinician Pick FLOWER POWERED · Topical · CBD Field Balm № 4 A full-spectrum balm for everyday body tension after long days. 2oz · 500mg 76% helped · n=384 $48 Add Field Balm № 4 to cart" [ref=e971] [cursor=pointer]:
            - /url: /leafmart/products/field-balm-no-4
            - generic [ref=e972]:
              - img [ref=e975]:
                - generic [ref=e980]: field balm № 4
              - generic [ref=e981]: Clinician Pick
              - generic [ref=e983]:
                - img [ref=e984]
                - text: Clinician Pick
            - generic [ref=e986]:
              - paragraph [ref=e987]: FLOWER POWERED · Topical · CBD
              - heading "Field Balm № 4" [level=4] [ref=e988]
              - paragraph [ref=e989]: A full-spectrum balm for everyday body tension after long days.
              - generic [ref=e990]:
                - generic [ref=e991]:
                  - generic [ref=e992]: 2oz · 500mg
                  - generic [ref=e993]: 76% helped · n=384
                - generic [ref=e995]:
                  - generic [ref=e996]: $48
                  - button "Add Field Balm № 4 to cart" [ref=e997]:
                    - img [ref=e998]
          - link "New COA GREENLEAF CO. · Edible · CBN Crescent CBN Gummies Soft pectin gummies, 10mg CBN with a touch of CBD. 20 ct · 10mg CBN ea 77% helped · n=274 $38 Add Crescent CBN Gummies to cart" [ref=e1002] [cursor=pointer]:
            - /url: /leafmart/products/crescent-cbn-gummies
            - generic [ref=e1003]:
              - img [ref=e1006]
              - generic [ref=e1013]: New
              - generic [ref=e1015]:
                - img [ref=e1016]
                - text: COA
            - generic [ref=e1019]:
              - paragraph [ref=e1020]: GREENLEAF CO. · Edible · CBN
              - heading "Crescent CBN Gummies" [level=4] [ref=e1021]
              - paragraph [ref=e1022]: Soft pectin gummies, 10mg CBN with a touch of CBD.
              - generic [ref=e1023]:
                - generic [ref=e1024]:
                  - generic [ref=e1025]: 20 ct · 10mg CBN ea
                  - generic [ref=e1026]: 77% helped · n=274
                - generic [ref=e1028]:
                  - generic [ref=e1029]: $38
                  - button "Add Crescent CBN Gummies to cart" [ref=e1030]:
                    - img [ref=e1031]
          - link "New COA FLOWER POWERED · Topical · CBD Drift Pillow Mist CBD pillow mist with lavender and chamomile hydrosols. 120 mL mist 68% helped · n=92 $26 Add Drift Pillow Mist to cart" [ref=e1035] [cursor=pointer]:
            - /url: /leafmart/products/drift-pillow-mist
            - generic [ref=e1036]:
              - img [ref=e1039]
              - generic [ref=e1047]: New
              - generic [ref=e1049]:
                - img [ref=e1050]
                - text: COA
            - generic [ref=e1053]:
              - paragraph [ref=e1054]: FLOWER POWERED · Topical · CBD
              - heading "Drift Pillow Mist" [level=4] [ref=e1055]
              - paragraph [ref=e1056]: CBD pillow mist with lavender and chamomile hydrosols.
              - generic [ref=e1057]:
                - generic [ref=e1058]:
                  - generic [ref=e1059]: 120 mL mist
                  - generic [ref=e1060]: 68% helped · n=92
                - generic [ref=e1062]:
                  - generic [ref=e1063]: $26
                  - button "Add Drift Pillow Mist to cart" [ref=e1064]:
                    - img [ref=e1065]
          - link "New COA GREENLEAF CO. · Edible · CBN Lullaby Sleep Tea Chamomile + passionflower with 5mg CBN per sachet. 20 sachets · 5mg CBN ea 72% helped · n=148 $28 Add Lullaby Sleep Tea to cart" [ref=e1069] [cursor=pointer]:
            - /url: /leafmart/products/lullaby-sleep-tea
            - generic [ref=e1070]:
              - img [ref=e1073]:
                - generic [ref=e1076]: edibles
              - generic [ref=e1080]: New
              - generic [ref=e1082]:
                - img [ref=e1083]
                - text: COA
            - generic [ref=e1086]:
              - paragraph [ref=e1087]: GREENLEAF CO. · Edible · CBN
              - heading "Lullaby Sleep Tea" [level=4] [ref=e1088]
              - paragraph [ref=e1089]: Chamomile + passionflower with 5mg CBN per sachet.
              - generic [ref=e1090]:
                - generic [ref=e1091]:
                  - generic [ref=e1092]: 20 sachets · 5mg CBN ea
                  - generic [ref=e1093]: 72% helped · n=148
                - generic [ref=e1095]:
                  - generic [ref=e1096]: $28
                  - button "Add Lullaby Sleep Tea to cart" [ref=e1097]:
                    - img [ref=e1098]
          - link "New COA PHYTORX · Capsule · CBN Twilight Capsules Single-dose CBN capsules for the bedside drawer. 30 ct · 10mg CBN 76% helped · n=211 $42 Add Twilight Capsules to cart" [ref=e1102] [cursor=pointer]:
            - /url: /leafmart/products/twilight-capsules
            - generic [ref=e1103]:
              - img [ref=e1106]
              - generic [ref=e1114]: New
              - generic [ref=e1116]:
                - img [ref=e1117]
                - text: COA
            - generic [ref=e1120]:
              - paragraph [ref=e1121]: PHYTORX · Capsule · CBN
              - heading "Twilight Capsules" [level=4] [ref=e1122]
              - paragraph [ref=e1123]: Single-dose CBN capsules for the bedside drawer.
              - generic [ref=e1124]:
                - generic [ref=e1125]:
                  - generic [ref=e1126]: 30 ct · 10mg CBN
                  - generic [ref=e1127]: 76% helped · n=211
                - generic [ref=e1129]:
                  - generic [ref=e1130]: $42
                  - button "Add Twilight Capsules to cart" [ref=e1131]:
                    - img [ref=e1132]
          - link "New COA GREENLEAF CO. · Tincture · CBN Quiet Hours Tincture Designed for evening wind-down routines. Plant-powered. 30 mL · 1500mg 79% helped · n=502 $64 Add Quiet Hours Tincture to cart" [ref=e1136] [cursor=pointer]:
            - /url: /leafmart/products/quiet-hours-tincture
            - generic [ref=e1137]:
              - img [ref=e1140]
              - generic [ref=e1148]: New
              - generic [ref=e1150]:
                - img [ref=e1151]
                - text: COA
            - generic [ref=e1154]:
              - paragraph [ref=e1155]: GREENLEAF CO. · Tincture · CBN
              - heading "Quiet Hours Tincture" [level=4] [ref=e1156]
              - paragraph [ref=e1157]: Designed for evening wind-down routines. Plant-powered.
              - generic [ref=e1158]:
                - generic [ref=e1159]:
                  - generic [ref=e1160]: 30 mL · 1500mg
                  - generic [ref=e1161]: 79% helped · n=502
                - generic [ref=e1163]:
                  - generic [ref=e1164]: $64
                  - button "Add Quiet Hours Tincture to cart" [ref=e1165]:
                    - img [ref=e1166]
          - link "Clinician Pick Clinician Pick PHYTORX · Beverage · CBN Stillwater Sleep Tonic A 25mg CBN tonic for the hour before bed. Made with magnesium glycinate. 12 fl oz · 25mg CBN 81% helped · n=612 $32 Add Stillwater Sleep Tonic to cart" [ref=e1170] [cursor=pointer]:
            - /url: /leafmart/products/stillwater-sleep-tonic
            - generic [ref=e1171]:
              - img [ref=e1174]:
                - generic [ref=e1179]: still
              - generic [ref=e1183]: Clinician Pick
              - generic [ref=e1185]:
                - img [ref=e1186]
                - text: Clinician Pick
            - generic [ref=e1188]:
              - paragraph [ref=e1189]: PHYTORX · Beverage · CBN
              - heading "Stillwater Sleep Tonic" [level=4] [ref=e1190]
              - paragraph [ref=e1191]: A 25mg CBN tonic for the hour before bed. Made with magnesium glycinate.
              - generic [ref=e1192]:
                - generic [ref=e1193]:
                  - generic [ref=e1194]: 12 fl oz · 25mg CBN
                  - generic [ref=e1195]: 81% helped · n=612
                - generic [ref=e1197]:
                  - generic [ref=e1198]: $32
                  - button "Add Stillwater Sleep Tonic to cart" [ref=e1199]:
                    - img [ref=e1200]
          - link "New COA SOLACE BOTANICALS · Patch · CBD Tension Relief Patch 12-hour transdermal patch for sustained pain relief. 25mg 86% helped · n=38 $28 Add Tension Relief Patch to cart" [ref=e1204] [cursor=pointer]:
            - /url: /leafmart/products/solace-tension-patch
            - generic [ref=e1205]:
              - img [ref=e1208]:
                - generic [ref=e1213]: field balm № 4
              - generic [ref=e1214]: New
              - generic [ref=e1216]:
                - img [ref=e1217]
                - text: COA
            - generic [ref=e1220]:
              - paragraph [ref=e1221]: SOLACE BOTANICALS · Patch · CBD
              - heading "Tension Relief Patch" [level=4] [ref=e1222]
              - paragraph [ref=e1223]: 12-hour transdermal patch for sustained pain relief.
              - generic [ref=e1224]:
                - generic [ref=e1225]:
                  - generic [ref=e1226]: 25mg
                  - generic [ref=e1227]: 86% helped · n=38
                - generic [ref=e1229]:
                  - generic [ref=e1230]: $28
                  - button "Add Tension Relief Patch to cart" [ref=e1231]:
                    - img [ref=e1232]
          - link "New COA BOTANICA THERAPEUTICS · Edible · CBN Rest & Restore Gummies CBN + melatonin gummies for natural sleep support. 20mg 90% helped · n=72 $34 Add Rest & Restore Gummies to cart" [ref=e1236] [cursor=pointer]:
            - /url: /leafmart/products/botanica-rest-gummies
            - generic [ref=e1237]:
              - img [ref=e1240]:
                - generic [ref=e1243]: edibles
              - generic [ref=e1247]: New
              - generic [ref=e1249]:
                - img [ref=e1250]
                - text: COA
            - generic [ref=e1253]:
              - paragraph [ref=e1254]: BOTANICA THERAPEUTICS · Edible · CBN
              - heading "Rest & Restore Gummies" [level=4] [ref=e1255]
              - paragraph [ref=e1256]: CBN + melatonin gummies for natural sleep support.
              - generic [ref=e1257]:
                - generic [ref=e1258]:
                  - generic [ref=e1259]: 20mg
                  - generic [ref=e1260]: 90% helped · n=72
                - generic [ref=e1262]:
                  - generic [ref=e1263]: $34
                  - button "Add Rest & Restore Gummies to cart" [ref=e1264]:
                    - img [ref=e1265]
          - link "New COA VERDANA WELLNESS · Tincture · CBD Uplift Daytime Tincture Sativa-forward tincture for daytime energy and mood. 18mg 88% helped · n=29 $52 Add Uplift Daytime Tincture to cart" [ref=e1269] [cursor=pointer]:
            - /url: /leafmart/products/verdana-uplift-tincture
            - generic [ref=e1270]:
              - img [ref=e1273]:
                - generic [ref=e1278]: still
              - generic [ref=e1282]: New
              - generic [ref=e1284]:
                - img [ref=e1285]
                - text: COA
            - generic [ref=e1288]:
              - paragraph [ref=e1289]: VERDANA WELLNESS · Tincture · CBD
              - heading "Uplift Daytime Tincture" [level=4] [ref=e1290]
              - paragraph [ref=e1291]: Sativa-forward tincture for daytime energy and mood.
              - generic [ref=e1292]:
                - generic [ref=e1293]:
                  - generic [ref=e1294]: 18mg
                  - generic [ref=e1295]: 88% helped · n=29
                - generic [ref=e1297]:
                  - generic [ref=e1298]: $52
                  - button "Add Uplift Daytime Tincture to cart" [ref=e1299]:
                    - img [ref=e1300]
          - link "Clinician Pick Clinician Pick BOTANICA THERAPEUTICS · Capsule · CBD Soothe Softgels THC + CBD + ginger softgels for nausea support. 15mg 92% helped · n=45 $46 Add Soothe Softgels to cart" [ref=e1304] [cursor=pointer]:
            - /url: /leafmart/products/botanica-soothe-softgels
            - generic [ref=e1305]:
              - img [ref=e1308]:
                - generic [ref=e1313]: still
              - generic [ref=e1317]: Clinician Pick
              - generic [ref=e1319]:
                - img [ref=e1320]
                - text: Clinician Pick
            - generic [ref=e1322]:
              - paragraph [ref=e1323]: BOTANICA THERAPEUTICS · Capsule · CBD
              - heading "Soothe Softgels" [level=4] [ref=e1324]
              - paragraph [ref=e1325]: THC + CBD + ginger softgels for nausea support.
              - generic [ref=e1326]:
                - generic [ref=e1327]:
                  - generic [ref=e1328]: 15mg
                  - generic [ref=e1329]: 92% helped · n=45
                - generic [ref=e1331]:
                  - generic [ref=e1332]: $46
                  - button "Add Soothe Softgels to cart" [ref=e1333]:
                    - img [ref=e1334]
          - link "New COA SOLACE BOTANICALS · Vape · CBD Restore Vaporizer Fast-acting indica vaporizer for evening relief. 80mg 90% helped · n=56 $44 Add Restore Vaporizer to cart" [ref=e1338] [cursor=pointer]:
            - /url: /leafmart/products/solace-restore-vape
            - generic [ref=e1339]:
              - img [ref=e1342]:
                - generic [ref=e1347]: field balm № 4
              - generic [ref=e1348]: New
              - generic [ref=e1350]:
                - img [ref=e1351]
                - text: COA
            - generic [ref=e1354]:
              - paragraph [ref=e1355]: SOLACE BOTANICALS · Vape · CBD
              - heading "Restore Vaporizer" [level=4] [ref=e1356]
              - paragraph [ref=e1357]: Fast-acting indica vaporizer for evening relief.
              - generic [ref=e1358]:
                - generic [ref=e1359]:
                  - generic [ref=e1360]: 80mg
                  - generic [ref=e1361]: 90% helped · n=56
                - generic [ref=e1363]:
                  - generic [ref=e1364]: $44
                  - button "Add Restore Vaporizer to cart" [ref=e1365]:
                    - img [ref=e1366]
          - link "New COA CANOPY CLINICAL · Capsule · CBD Focus Support Capsules Microdose THC + nootropic capsules for focus. 8mg 86% helped · n=34 $62 Add Focus Support Capsules to cart" [ref=e1370] [cursor=pointer]:
            - /url: /leafmart/products/canopy-clinical-focus-capsules
            - generic [ref=e1371]:
              - img [ref=e1374]:
                - generic [ref=e1377]: edibles
              - generic [ref=e1381]: New
              - generic [ref=e1383]:
                - img [ref=e1384]
                - text: COA
            - generic [ref=e1387]:
              - paragraph [ref=e1388]: CANOPY CLINICAL · Capsule · CBD
              - heading "Focus Support Capsules" [level=4] [ref=e1389]
              - paragraph [ref=e1390]: Microdose THC + nootropic capsules for focus.
              - generic [ref=e1391]:
                - generic [ref=e1392]:
                  - generic [ref=e1393]: 8mg
                  - generic [ref=e1394]: 86% helped · n=34
                - generic [ref=e1396]:
                  - generic [ref=e1397]: $62
                  - button "Add Focus Support Capsules to cart" [ref=e1398]:
                    - img [ref=e1399]
          - link "Clinician Pick Clinician Pick BOTANICA THERAPEUTICS · Edible · CBD Ease Gummies 5 mg THC / 10 mg CBD gummies for gentle relief. 15mg 94% helped · n=98 $36 Add Ease Gummies to cart" [ref=e1403] [cursor=pointer]:
            - /url: /leafmart/products/botanica-ease-gummies
            - generic [ref=e1404]:
              - img [ref=e1407]:
                - generic [ref=e1412]: field balm № 4
              - generic [ref=e1413]: Clinician Pick
              - generic [ref=e1415]:
                - img [ref=e1416]
                - text: Clinician Pick
            - generic [ref=e1418]:
              - paragraph [ref=e1419]: BOTANICA THERAPEUTICS · Edible · CBD
              - heading "Ease Gummies" [level=4] [ref=e1420]
              - paragraph [ref=e1421]: 5 mg THC / 10 mg CBD gummies for gentle relief.
              - generic [ref=e1422]:
                - generic [ref=e1423]:
                  - generic [ref=e1424]: 15mg
                  - generic [ref=e1425]: 94% helped · n=98
                - generic [ref=e1427]:
                  - generic [ref=e1428]: $36
                  - button "Add Ease Gummies to cart" [ref=e1429]:
                    - img [ref=e1430]
          - link "New COA VERDANA WELLNESS · Topical · CBD Recovery Cooling Gel CBD cooling gel for post-activity recovery. 20mg 88% helped · n=41 $38 Add Recovery Cooling Gel to cart" [ref=e1434] [cursor=pointer]:
            - /url: /leafmart/products/verdana-recovery-gel
            - generic [ref=e1435]:
              - img [ref=e1438]:
                - generic [ref=e1443]: field balm № 4
              - generic [ref=e1444]: New
              - generic [ref=e1446]:
                - img [ref=e1447]
                - text: COA
            - generic [ref=e1450]:
              - paragraph [ref=e1451]: VERDANA WELLNESS · Topical · CBD
              - heading "Recovery Cooling Gel" [level=4] [ref=e1452]
              - paragraph [ref=e1453]: CBD cooling gel for post-activity recovery.
              - generic [ref=e1454]:
                - generic [ref=e1455]:
                  - generic [ref=e1456]: 20mg
                  - generic [ref=e1457]: 88% helped · n=41
                - generic [ref=e1459]:
                  - generic [ref=e1460]: $38
                  - button "Add Recovery Cooling Gel to cart" [ref=e1461]:
                    - img [ref=e1462]
          - link "New COA SOLACE BOTANICALS · Tincture · CBD Calm & Clarity Drops Balanced THC:CBD drops for daytime calm without sedation. 25mg 90% helped · n=53 $58 Add Calm & Clarity Drops to cart" [ref=e1466] [cursor=pointer]:
            - /url: /leafmart/products/solace-calm-drops
            - generic [ref=e1467]:
              - img [ref=e1470]
              - generic [ref=e1478]: New
              - generic [ref=e1480]:
                - img [ref=e1481]
                - text: COA
            - generic [ref=e1484]:
              - paragraph [ref=e1485]: SOLACE BOTANICALS · Tincture · CBD
              - heading "Calm & Clarity Drops" [level=4] [ref=e1486]
              - paragraph [ref=e1487]: Balanced THC:CBD drops for daytime calm without sedation.
              - generic [ref=e1488]:
                - generic [ref=e1489]:
                  - generic [ref=e1490]: 25mg
                  - generic [ref=e1491]: 90% helped · n=53
                - generic [ref=e1493]:
                  - generic [ref=e1494]: $58
                  - button "Add Calm & Clarity Drops to cart" [ref=e1495]:
                    - img [ref=e1496]
          - link "Clinician Pick Clinician Pick CANOPY CLINICAL · Capsule · CBD Daily Balance Capsules 25 mg CBD softgels for consistent daily wellness. 25mg 92% helped · n=67 $54 Add Daily Balance Capsules to cart" [ref=e1500] [cursor=pointer]:
            - /url: /leafmart/products/canopy-clinical-balance-capsules
            - generic [ref=e1501]:
              - img [ref=e1504]
              - generic [ref=e1512]: Clinician Pick
              - generic [ref=e1514]:
                - img [ref=e1515]
                - text: Clinician Pick
            - generic [ref=e1517]:
              - paragraph [ref=e1518]: CANOPY CLINICAL · Capsule · CBD
              - heading "Daily Balance Capsules" [level=4] [ref=e1519]
              - paragraph [ref=e1520]: 25 mg CBD softgels for consistent daily wellness.
              - generic [ref=e1521]:
                - generic [ref=e1522]:
                  - generic [ref=e1523]: 25mg
                  - generic [ref=e1524]: 92% helped · n=67
                - generic [ref=e1526]:
                  - generic [ref=e1527]: $54
                  - button "Add Daily Balance Capsules to cart" [ref=e1528]:
                    - img [ref=e1529]
          - link "Clinician Pick Clinician Pick VERDANA WELLNESS · Topical · CBD Deep Relief Balm Full-spectrum topical for targeted pain and inflammation. 35mg 94% helped · n=89 $48 Add Deep Relief Balm to cart" [ref=e1533] [cursor=pointer]:
            - /url: /leafmart/products/verdana-relief-balm
            - generic [ref=e1534]:
              - img [ref=e1537]:
                - generic [ref=e1542]: field balm № 4
              - generic [ref=e1543]: Clinician Pick
              - generic [ref=e1545]:
                - img [ref=e1546]
                - text: Clinician Pick
            - generic [ref=e1548]:
              - paragraph [ref=e1549]: VERDANA WELLNESS · Topical · CBD
              - heading "Deep Relief Balm" [level=4] [ref=e1550]
              - paragraph [ref=e1551]: Full-spectrum topical for targeted pain and inflammation.
              - generic [ref=e1552]:
                - generic [ref=e1553]:
                  - generic [ref=e1554]: 35mg
                  - generic [ref=e1555]: 94% helped · n=89
                - generic [ref=e1557]:
                  - generic [ref=e1558]: $48
                  - button "Add Deep Relief Balm to cart" [ref=e1559]:
                    - img [ref=e1560]
          - link "Clinician Pick Clinician Pick SOLACE BOTANICALS · Tincture · CBN Nightfall Sleep Tincture CBN + CBD sleep tincture for deep, restorative rest. 37mg 96% helped · n=124 $64 Add Nightfall Sleep Tincture to cart" [ref=e1564] [cursor=pointer]:
            - /url: /leafmart/products/solace-nightfall-tincture
            - generic [ref=e1565]:
              - img [ref=e1568]:
                - generic [ref=e1573]: still
              - generic [ref=e1577]: Clinician Pick
              - generic [ref=e1579]:
                - img [ref=e1580]
                - text: Clinician Pick
            - generic [ref=e1582]:
              - paragraph [ref=e1583]: SOLACE BOTANICALS · Tincture · CBN
              - heading "Nightfall Sleep Tincture" [level=4] [ref=e1584]
              - paragraph [ref=e1585]: CBN + CBD sleep tincture for deep, restorative rest.
              - generic [ref=e1586]:
                - generic [ref=e1587]:
                  - generic [ref=e1588]: 37mg
                  - generic [ref=e1589]: 96% helped · n=124
                - generic [ref=e1591]:
                  - generic [ref=e1592]: $64
                  - button "Add Nightfall Sleep Tincture to cart" [ref=e1593]:
                    - img [ref=e1594]
      - generic [ref=e1598]:
        - generic [ref=e1599]:
          - paragraph [ref=e1600]: The Method
          - heading "Three layers of editing, before a single product reaches your cart." [level=2] [ref=e1601]:
            - text: Three layers of editing,
            - emphasis [ref=e1602]: before
            - text: a single product reaches your cart.
        - generic [ref=e1603]:
          - generic [ref=e1604]:
            - generic [ref=e1605]:
              - generic [ref=e1606]: "01"
              - heading "Physician Curated" [level=3] [ref=e1607]
            - paragraph [ref=e1608]: A licensed clinician on the Leafjourney medical desk reviews every product — formulation, manufacturer, lab — before it gets listed.
          - generic [ref=e1609]:
            - generic [ref=e1610]:
              - generic [ref=e1611]: "02"
              - heading "Lab Verified" [level=3] [ref=e1612]
            - paragraph [ref=e1613]: A third-party Certificate of Analysis is on file for every SKU. Potency, terpenes, residuals — all checked against the label.
          - generic [ref=e1614]:
            - generic [ref=e1615]:
              - generic [ref=e1616]: "03"
              - heading "Outcome Informed" [level=3] [ref=e1617]
            - paragraph [ref=e1618]: Rankings shift quietly based on de-identified outcomes from patients in the connected Leafjourney care platform.
      - generic [ref=e1620]:
        - generic [ref=e1621]:
          - generic [ref=e1622]:
            - paragraph [ref=e1623]: Founding partners
            - heading "A short list of brands we'd send a friend to." [level=2] [ref=e1624]:
              - text: A short list of brands we'd
              - emphasis [ref=e1625]: send a friend to
              - text: .
          - paragraph [ref=e1626]: Founding partners pay a flat 10% — locked for two years. We don't take placement fees. The shelf is curated, not sold.
        - generic [ref=e1627]:
          - generic [ref=e1628] [cursor=pointer]:
            - img [ref=e1633]:
              - generic [ref=e1638]: still
            - heading "AULV (PLNT PWRD)" [level=4] [ref=e1642]
            - paragraph [ref=e1643]: Founding partner — clinician-reviewed.
          - generic [ref=e1644] [cursor=pointer]:
            - img [ref=e1649]:
              - generic [ref=e1654]: field balm № 4
            - heading "Flower Powered" [level=4] [ref=e1655]
            - paragraph [ref=e1656]: Founding partner — clinician-reviewed.
          - generic [ref=e1657] [cursor=pointer]:
            - img [ref=e1662]
            - heading "Greenleaf Co." [level=4] [ref=e1670]
            - paragraph [ref=e1671]: Founding partner — clinician-reviewed.
          - generic [ref=e1672] [cursor=pointer]:
            - img [ref=e1677]:
              - generic [ref=e1682]: gold
              - generic [ref=e1683]: serum
            - heading "PhytoRx" [level=4] [ref=e1684]
            - paragraph [ref=e1685]: Founding partner — clinician-reviewed.
          - generic [ref=e1686] [cursor=pointer]:
            - img [ref=e1691]:
              - generic [ref=e1696]: still
            - heading "Potency 710" [level=4] [ref=e1700]
            - paragraph [ref=e1701]: Founding partner — clinician-reviewed.
      - generic [ref=e1702]:
        - generic [ref=e1703]:
          - paragraph [ref=e1704]: In their own words
          - heading "The members who've made Leafmart part of their week." [level=2] [ref=e1705]:
            - text: The members who've made Leafmart
            - emphasis [ref=e1706]: part of their week
            - text: .
        - generic [ref=e1707]:
          - generic [ref=e1708]:
            - generic [ref=e1709]: “
            - paragraph [ref=e1710]: I'd been curious about CBN for sleep but didn't know where to start without ending up on a sketchy site. Leafmart felt like a real shop.
            - generic [ref=e1711]:
              - generic [ref=e1712]: M
              - generic [ref=e1713]:
                - generic [ref=e1714]: Maya R.
                - generic [ref=e1715]: Brooklyn, NY
          - generic [ref=e1716]:
            - generic [ref=e1717]: “
            - paragraph [ref=e1718]: The clinician note on each product is the thing. I'm not guessing whether something was tested — they tell me exactly what was checked.
            - generic [ref=e1719]:
              - generic [ref=e1720]: D
              - generic [ref=e1721]:
                - generic [ref=e1722]: Daniel K.
                - generic [ref=e1723]: Austin, TX
          - generic [ref=e1724]:
            - generic [ref=e1725]: “
            - paragraph [ref=e1726]: My acupuncturist sent me here. That alone said something about how the brand is positioned. The Field Balm is now part of my recovery routine.
            - generic [ref=e1727]:
              - generic [ref=e1728]: P
              - generic [ref=e1729]:
                - generic [ref=e1730]: Priya S.
                - generic [ref=e1731]: San Francisco, CA
      - generic [ref=e1734]:
        - generic [ref=e1735]:
          - generic [ref=e1736]:
            - img "Rosa, 64 · Rest Shelf" [ref=e1737]
            - generic [ref=e1738]: Rosa, 64 · Rest Shelf
          - generic [ref=e1739]:
            - heading "Wellness, across every life" [level=3] [ref=e1740]
            - generic [ref=e1741]:
              - generic [ref=e1742]:
                - img [ref=e1744]
                - generic [ref=e1746]: Curated for people, not patients
              - generic [ref=e1747]:
                - img [ref=e1749]
                - generic [ref=e1751]: Plant-powered, plainly labeled
              - generic [ref=e1752]:
                - img [ref=e1754]
                - generic [ref=e1756]: For every stage of life, every body, every ritual
              - generic [ref=e1757]:
                - img [ref=e1759]
                - generic [ref=e1761]: Quiet support for everyday life
              - generic [ref=e1762]:
                - img [ref=e1764]
                - generic [ref=e1766]: From an actual healthcare brand
        - generic [ref=e1767]:
          - paragraph [ref=e1768]: For real people, in real lives
          - heading "Care that fits the rhythm of your week." [level=2] [ref=e1769]:
            - text: Care that
            - emphasis [ref=e1770]: fits the rhythm
            - text: of your week.
          - paragraph [ref=e1771]: Leafmart members are nurses unwinding after a swing shift, dads steadying their evenings, retirees swapping a nightly drink for a tonic, runners protecting their recovery. Same shelf. Different reasons.
          - generic [ref=e1772]:
            - generic [ref=e1773]:
              - generic [ref=e1774]:
                - img "Marcus, 38 · Relief" [ref=e1775]
                - generic [ref=e1776]: Marcus, 38 · Relief
              - generic [ref=e1777]:
                - generic [ref=e1778]: The day after a long shift
                - generic [ref=e1779]: Full-spectrum balm · Relief shelf
            - generic [ref=e1780]:
              - generic [ref=e1781]:
                - img "Aanya, 31 · Calm" [ref=e1782]
                - generic [ref=e1783]: Aanya, 31 · Calm
              - generic [ref=e1784]:
                - generic [ref=e1785]: Sunday afternoon, off the clock
                - generic [ref=e1786]: CBN sleep tonic · Calm shelf
            - generic [ref=e1787]:
              - generic [ref=e1788]:
                - img "James, 82 · Rest" [ref=e1789]
                - generic [ref=e1790]: James, 82 · Rest
              - generic [ref=e1791]:
                - generic [ref=e1792]: The hour before bed
                - generic [ref=e1793]: CBD + CBN tincture · Rest shelf
            - generic [ref=e1794]:
              - generic [ref=e1795]:
                - img "Eleanor, 71 · Skin" [ref=e1796]
                - generic [ref=e1797]: Eleanor, 71 · Skin
              - generic [ref=e1798]:
                - generic [ref=e1799]: A slower morning routine
                - generic [ref=e1800]: CBD skin serum · Skin shelf
      - generic [ref=e1802]:
        - generic [ref=e1803]:
          - paragraph [ref=e1804]: 2-minute quiz
          - heading "Not sure where to start? We'll point you somewhere." [level=2] [ref=e1805]:
            - text: Not sure where to start?
            - emphasis [ref=e1806]: We'll point you somewhere.
          - paragraph [ref=e1807]: Tell us how you'd like to feel. We'll match you with three clinician-reviewed products to consider — no signup required.
          - generic [ref=e1808]:
            - link "Take the quiz →" [ref=e1809] [cursor=pointer]:
              - /url: /leafmart/quiz
            - link "Browse the shelves" [ref=e1810] [cursor=pointer]:
              - /url: /leafmart/shop
        - generic [ref=e1812]:
          - generic [ref=e1813]:
            - generic [ref=e1814]: "01"
            - generic [ref=e1815]: What would you like to feel?
            - generic [ref=e1816]: Calmer in the evening
          - generic [ref=e1817]:
            - generic [ref=e1818]: "02"
            - generic [ref=e1819]: Have you used cannabis for wellness?
            - generic [ref=e1820]: Curious, not regular
          - generic [ref=e1821]:
            - generic [ref=e1822]: "03"
            - generic [ref=e1823]: Any restrictions to know about?
            - generic [ref=e1824]: I prefer non-intoxicating
    - contentinfo [ref=e1825]:
      - generic [ref=e1826]:
        - generic [ref=e1827]:
          - generic [ref=e1828]:
            - generic [ref=e1829]:
              - img [ref=e1830]
              - generic [ref=e1833]: Leafmart
            - paragraph [ref=e1834]: A clinician-curated cannabis wellness marketplace. From Leafjourney Health.
          - generic [ref=e1835]:
            - heading "Stay in the loop" [level=3] [ref=e1836]
            - paragraph [ref=e1837]: New products, dosing tips, and the occasional field note. No filler.
            - generic [ref=e1838]:
              - generic [ref=e1839]: Email address
              - textbox "Email address" [ref=e1840]:
                - /placeholder: you@email.com
              - button "Join" [ref=e1841] [cursor=pointer]
        - generic [ref=e1842]:
          - generic [ref=e1843]:
            - button "Shelves":
              - generic: Shelves
            - list [ref=e1844]:
              - listitem [ref=e1845]:
                - link "Rest" [ref=e1846] [cursor=pointer]:
                  - /url: /leafmart/category/rest
              - listitem [ref=e1847]:
                - link "Relief" [ref=e1848] [cursor=pointer]:
                  - /url: /leafmart/category/relief
              - listitem [ref=e1849]:
                - link "Calm" [ref=e1850] [cursor=pointer]:
                  - /url: /leafmart/category/calm
              - listitem [ref=e1851]:
                - link "Skin" [ref=e1852] [cursor=pointer]:
                  - /url: /leafmart/category/skin
              - listitem [ref=e1853]:
                - link "Focus" [ref=e1854] [cursor=pointer]:
                  - /url: /leafmart/category/focus
          - generic [ref=e1855]:
            - button "About":
              - generic: About
            - list [ref=e1856]:
              - listitem [ref=e1857]:
                - link "The Method" [ref=e1858] [cursor=pointer]:
                  - /url: /leafmart/about
              - listitem [ref=e1859]:
                - link "Vendors" [ref=e1860] [cursor=pointer]:
                  - /url: /leafmart/vendors
              - listitem [ref=e1861]:
                - link "Field Notes" [ref=e1862] [cursor=pointer]:
                  - /url: /leafmart/about#field-notes
              - listitem [ref=e1863]:
                - link "Careers" [ref=e1864] [cursor=pointer]:
                  - /url: /leafmart/about#careers
          - generic [ref=e1865]:
            - button "Help":
              - generic: Help
            - list [ref=e1866]:
              - listitem [ref=e1867]:
                - link "FAQ" [ref=e1868] [cursor=pointer]:
                  - /url: /leafmart/faq
              - listitem [ref=e1869]:
                - link "Shipping" [ref=e1870] [cursor=pointer]:
                  - /url: /legal/shipping
              - listitem [ref=e1871]:
                - link "Returns" [ref=e1872] [cursor=pointer]:
                  - /url: /legal/returns
              - listitem [ref=e1873]:
                - link "Contact" [ref=e1874] [cursor=pointer]:
                  - /url: /leafmart/faq#contact
          - generic [ref=e1875]:
            - button "Legal":
              - generic: Legal
            - list [ref=e1876]:
              - listitem [ref=e1877]:
                - link "Terms" [ref=e1878] [cursor=pointer]:
                  - /url: /legal/terms
              - listitem [ref=e1879]:
                - link "Privacy" [ref=e1880] [cursor=pointer]:
                  - /url: /legal/privacy
              - listitem [ref=e1881]:
                - link "Disputes" [ref=e1882] [cursor=pointer]:
                  - /url: /legal/disputes
              - listitem [ref=e1883]:
                - link "21+ Notice" [ref=e1884] [cursor=pointer]:
                  - /url: /leafmart/faq#age
        - region "Legal disclaimer" [ref=e1885]:
          - paragraph [ref=e1886]:
            - strong [ref=e1887]: Not medical advice.
            - text: Information on this site is general and educational. Use of Leafmart does not create a physician-patient relationship. Talk to your healthcare provider before starting, changing, or stopping anything you take.
          - paragraph [ref=e1888]:
            - strong [ref=e1889]: Hemp products only.
            - text: Leafmart ships only hemp-derived products that are legal under the federal 2018 Farm Bill (less than 0.3% delta-9 THC by dry weight). We do not ship to military bases (APO/FPO/DPO), VA facilities, U.S. territories, or international addresses. Some states impose additional restrictions; restricted orders are blocked at checkout.
          - paragraph [ref=e1890]:
            - strong [ref=e1891]: 21+ only.
            - text: Products containing cannabinoids may not be sold to anyone under 21. Buyers assume full responsibility for use, including any drug-test, drug-interaction, or workplace consequences. Full terms in our
            - link "Terms of Service" [ref=e1892] [cursor=pointer]:
              - /url: /legal/terms
            - text: .
        - generic [ref=e1893]:
          - generic [ref=e1894]:
            - generic [ref=e1895]: © 2026 Leafmart, from Leafjourney Health.
            - button "Back to top" [ref=e1896] [cursor=pointer]:
              - generic [ref=e1897]: ↑
              - text: Back to top
          - generic [ref=e1898]:
            - generic [ref=e1899]: Hemp-derived products ship nationally where permitted.
            - generic [ref=e1900]: Licensed cannabis available intrastate only.
    - dialog "Shopping cart" [ref=e1901]:
      - banner [ref=e1902]:
        - generic [ref=e1903]:
          - paragraph [ref=e1904]: Your cart
          - heading "Empty" [level=2] [ref=e1905]
        - button "Close cart" [ref=e1906] [cursor=pointer]:
          - img [ref=e1907]
      - generic [ref=e1910]:
        - img [ref=e1912]
        - paragraph [ref=e1915]: Your cart is empty
        - paragraph [ref=e1916]: Browse physician-curated formulas, lab-verified and ranked by real outcomes.
        - link "Browse the shop" [ref=e1917] [cursor=pointer]:
          - /url: /leafmart/shop
    - dialog "Age confirmation required" [ref=e1918]:
      - button "Dismiss age confirmation" [ref=e1919]
      - generic [ref=e1921]:
        - generic [ref=e1924]: 21+
        - heading "Age confirmation required" [level=2] [ref=e1925]
        - paragraph [ref=e1926]: To purchase select products on The Leafmart, you must be 21 years of age or older. By continuing, you confirm that you meet this requirement and agree to use these products responsibly.
        - generic [ref=e1927] [cursor=pointer]:
          - checkbox "I have read and agree to the Terms of Service and Privacy Policy." [ref=e1928]
          - generic [ref=e1929]:
            - text: I have read and agree to the
            - link "Terms of Service" [ref=e1930]:
              - /url: /legal/terms
            - text: and
            - link "Privacy Policy" [ref=e1931]:
              - /url: /legal/privacy
            - text: .
        - generic [ref=e1932]:
          - button "I am 21 or older" [disabled] [ref=e1933]
          - button "I am not 21" [ref=e1934] [cursor=pointer]
        - paragraph [ref=e1935]: Please follow all applicable laws in your state or jurisdiction.
  - button "Send feedback" [ref=e1936] [cursor=pointer]:
    - generic [ref=e1937]: 🌱
  - alert [ref=e1938]
  - generic [ref=e1939]:
    - generic [ref=e1940]:
      - heading "We value your privacy" [level=3] [ref=e1941]
      - paragraph [ref=e1942]: We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies as outlined in our Privacy Policy.
    - generic [ref=e1943]:
      - button "Decline" [ref=e1944] [cursor=pointer]
      - button "Accept All" [ref=e1945] [cursor=pointer]
```

# Test source

```ts
  37  |     await loadHydrated(page, "/");
  38  | 
  39  |     // The hero CTA should reach /book-demo. There are several places
  40  |     // that say "Book a demo" on the landing; the visible top-of-page
  41  |     // CTA is the one we care about. Constrain to the first match
  42  |     // visible above the fold.
  43  |     const bookDemoLink = page
  44  |       .locator('a[href="/book-demo"], a[href^="/book-demo"]')
  45  |       .first();
  46  |     await expect(bookDemoLink).toBeVisible();
  47  |     await bookDemoLink.click();
  48  | 
  49  |     await page.waitForURL(/\/book-demo(\?.*)?$/, { timeout: 15_000 });
  50  |     await page.waitForLoadState("networkidle");
  51  | 
  52  |     // Fill the form and submit. Stub /api/contact so we don't generate
  53  |     // founder-inbox noise but still confirm the request fires.
  54  |     let posted = false;
  55  |     await page.route("**/api/contact**", async (route) => {
  56  |       posted = true;
  57  |       await route.fulfill({
  58  |         status: 200,
  59  |         contentType: "application/json",
  60  |         body: JSON.stringify({ ok: true, stubbed: true }),
  61  |       });
  62  |     });
  63  | 
  64  |     await page.locator('input[name="firstName"]').fill(STAMP);
  65  |     await page.locator('input[name="lastName"]').fill("Smoke");
  66  |     await page.locator('input[name="email"]').fill(`${STAMP}@example.com`);
  67  |     await page.locator('input[name="organization"]').fill("Smoke Health");
  68  |     await page.locator('input[name="phone"]').fill("555-555-5555");
  69  |     await page.locator('select[name="teamSize"]').selectOption({ index: 1 });
  70  |     await page
  71  |       .locator('textarea[name="message"]')
  72  |       .fill(`commercial conversion smoke ${STAMP}`);
  73  | 
  74  |     await page.locator('button[type="submit"]').first().click();
  75  |     await page.waitForTimeout(2500);
  76  | 
  77  |     expect(posted, "expected POST to /api/contact after Book demo submit").toBe(
  78  |       true,
  79  |     );
  80  |   });
  81  | 
  82  |   test("landing → marketplace → product detail renders", async ({ page }) => {
  83  |     await loadHydrated(page, "/");
  84  | 
  85  |     // The site header has a "Marketplace" link. Click it.
  86  |     const marketplaceLink = page
  87  |       .locator('header a[href="/marketplace"]')
  88  |       .first();
  89  |     await expect(marketplaceLink).toBeVisible();
  90  |     await marketplaceLink.click();
  91  | 
  92  |     await page.waitForURL(/\/marketplace(\?.*)?$/, { timeout: 15_000 });
  93  |     await page.waitForLoadState("networkidle");
  94  | 
  95  |     // The first product card should be clickable. Marketplace cards
  96  |     // link to /marketplace/products/<slug> per
  97  |     // src/app/marketplace/marketplace-client.tsx:308.
  98  |     const firstProductLink = page
  99  |       .locator('a[href^="/marketplace/products/"]')
  100 |       .first();
  101 |     await expect(firstProductLink).toBeVisible();
  102 | 
  103 |     const href = await firstProductLink.getAttribute("href");
  104 |     expect(
  105 |       href,
  106 |       "first marketplace product card should link to a real /marketplace/products/<slug>",
  107 |     ).toMatch(/^\/marketplace\/products\/[a-z0-9-]+$/);
  108 | 
  109 |     await firstProductLink.click();
  110 |     await page.waitForURL(/\/marketplace\/products\//, { timeout: 15_000 });
  111 |     await page.waitForLoadState("networkidle");
  112 | 
  113 |     // PDP must show: an <h1> (product name), the brand eyebrow, and a
  114 |     // price. If any of these aren't visible, the page is structurally
  115 |     // broken even if the route returns 200.
  116 |     await expect(page.locator("h1")).toBeVisible();
  117 |     await expect(page.getByText(/\$\d/).first()).toBeVisible();
  118 |     // Look for the "About this product" section header that the PDP
  119 |     // always renders — a stable structural marker.
  120 |     await expect(
  121 |       page.getByRole("heading", { name: /about this product/i }),
  122 |     ).toBeVisible();
  123 |   });
  124 | 
  125 |   test("landing → leafmart shop → category → product detail", async ({
  126 |     page,
  127 |   }) => {
  128 |     await loadHydrated(page, "/leafmart");
  129 | 
  130 |     // Click any category tile — the leafmart hub renders 17 of them,
  131 |     // all linking to /leafmart/category/<slug>. Pick the first one,
  132 |     // which is the curated "rest" shelf.
  133 |     const categoryLink = page
  134 |       .locator('a[href^="/leafmart/category/"]')
  135 |       .first();
  136 |     await expect(categoryLink).toBeVisible();
> 137 |     await categoryLink.click();
      |                        ^ Error: locator.click: Test timeout of 30000ms exceeded.
  138 | 
  139 |     await page.waitForURL(/\/leafmart\/category\//, { timeout: 15_000 });
  140 |     await page.waitForLoadState("networkidle");
  141 | 
  142 |     // Category page should show a shelf header (<h1>) and product cards.
  143 |     await expect(page.locator("h1")).toBeVisible();
  144 | 
  145 |     // Click the first leafmart product card.
  146 |     const productLink = page
  147 |       .locator('a[href^="/leafmart/products/"]')
  148 |       .first();
  149 |     await expect(productLink).toBeVisible();
  150 |     await productLink.click();
  151 | 
  152 |     await page.waitForURL(/\/leafmart\/products\//, { timeout: 15_000 });
  153 |     await page.waitForLoadState("networkidle");
  154 | 
  155 |     // PDP renders.
  156 |     await expect(page.locator("h1, h2").first()).toBeVisible();
  157 |   });
  158 | 
  159 |   test("contact form delivers to /api/contact", async ({ page }) => {
  160 |     // Direct test that the contact-form pipeline is intact. Pass 5
  161 |     // covers this against a stub; this version verifies the path is
  162 |     // observable end-to-end through to the dev API logger.
  163 |     let posted = false;
  164 |     await page.route("**/api/contact**", async (route) => {
  165 |       posted = true;
  166 |       await route.fulfill({
  167 |         status: 200,
  168 |         contentType: "application/json",
  169 |         body: JSON.stringify({ ok: true, stubbed: true }),
  170 |       });
  171 |     });
  172 | 
  173 |     await loadHydrated(page, "/contact");
  174 | 
  175 |     await page.locator('input[name="name"]').fill(`${STAMP} smoke`);
  176 |     await page.locator('input[name="email"]').fill(`${STAMP}@example.com`);
  177 |     await page
  178 |       .locator('textarea[name="message"]')
  179 |       .fill(`commercial conversion smoke probe ${STAMP}`);
  180 | 
  181 |     await page.locator('button[type="submit"]').first().click();
  182 |     await page.waitForTimeout(2500);
  183 | 
  184 |     expect(posted, "expected POST to /api/contact after /contact submit").toBe(
  185 |       true,
  186 |     );
  187 | 
  188 |     // Confirm the success state actually renders — silent-drop bugs
  189 |     // can leave a spinner spinning forever. The form swaps in a
  190 |     // "Message sent." heading on success.
  191 |     await expect(
  192 |       page.getByRole("heading", { name: /message sent/i }),
  193 |     ).toBeVisible({ timeout: 5_000 });
  194 |   });
  195 | });
  196 | 
```