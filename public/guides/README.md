# Education guide assets

Downloadable PDFs surfaced from the public Education tab.

| File | Ticket | Surfaced at |
| --- | --- | --- |
| `cannabis-and-cancer.pdf` | EMR-202 | Education → Research (below the PubMed search) |
| `leafjourney-trifold-reference-guide.pdf` | EMR-203 | Education → Reference Guide (`/education/trifold`) |

These PDFs are generated, not hand-edited. Regenerate after changing the
source content:

```bash
node scripts/generate-guides.mjs
```

The interactive web-flip trifold lives at `/education/trifold`; the canonical,
continually-updated Cannabis & Cancer book lives at
<https://freecannabiscancerbook.com>. Downloads are recorded via the
`trackGuideDownload` server action for the education analytics pipeline.
