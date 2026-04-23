# CLAUDE.md — Leafjourney EMR Development Directives

## Data Collection Philosophy (Dr. Patel Directive)

All agents and features must prioritize **simple, fun, enjoyable** patient data
collection that can be deconstructed for research, product development, insurance
and pharmaceutical reimbursements.

### Rules:
1. **Emoji-first surveys** — happy/sad/neutral faces for quick sentiment capture
2. **Numerical scales (1-10)** — always defined with anchor labels at both ends
3. **Per-product logging** — every cannabis product a patient uses gets its own
   simple outcome log (emoji + scale after each use)
4. **Auto-population everywhere** — dropdowns, pre-fills, smart defaults
5. **Apple iOS aesthetic** — the EMR must feel like an Apple product. Clean,
   minimal, large touch targets, delightful micro-interactions
6. **Fun > friction** — if a patient doesn't want to interact with it, it's
   wrong. Make data collection feel like a game, not a chore
7. **Structured for research** — every data point captured must be queryable,
   exportable, and usable for cohort analysis, efficacy studies, and
   reimbursement documentation

### Data capture surfaces:
- Post-dose emoji check-in (after each cannabis use)
- Weekly outcome scales (pain, sleep, anxiety, mood — 1-10 with face emojis)
- Product-specific efficacy tracking (per-product rating over time)
- Side effect logging (dropdown + severity scale)
- Treatment goal progress (visual progress bars)

### Data reuse targets:
- **Research:** De-identified cohort data for efficacy studies
- **Product development:** Which products work best for which conditions
- **Insurance:** Documented outcomes for reimbursement justification
- **Pharma:** Structured real-world evidence for drug development

---

## ChatCB — Cannabis Search Engine (PRIORITY)

### Vision
ChatCB is the cannabis industry's answer to ChatGPT — a conversational AI search
engine that pulls from PubMed, our own EMR data, and trusted cannabis resources.
It lives on the public-facing Education tab at LeafJourney.com.

### Framework Reference
Based on the Medical Cannabis Library (MCL) paper:
- **Source:** "Medical Cannabis Library: development of a curated database for
  research articles on cannabis therapeutic activity" (Journal of Cannabis
  Research, 2025, DOI: 10.1186/s42238-025-00295-7)
- **MCL approach:** 11,441 PubMed abstracts, 48,461 cannabinoid-disease pairs,
  classified as positive (26,450), negative (19,217), or neutral (2,794)
- **Our adaptation:** Build a conversational interface on top of this
  classification approach, enhanced with our own patient outcome data

### Architecture
- Public-facing (no login required for basic search)
- Conversational UI (chat-style, like ChatGPT)
- Data sources: PubMed API, our cannabis education database, our pharmacology
  database, trusted industry resources
- AI model: Uses the configured model client (OpenRouter/etc.)
- Results: Citations, evidence levels, plain-language summaries
- Cannabis-condition relationship: positive/negative/neutral classification

### Education Tab Structure (on landing page, LEFT of "Store")
1. **ChatCB** — Conversational cannabis search engine
2. **Cannabis Wheel** — Interactive cannabinoid/terpene wheel
3. **Drug Mix** — Drug interaction checker (public-facing version)
4. **Research** — PubMed article browser
5. **Learn** — Educational articles (moved from existing /learn page)
