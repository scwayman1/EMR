// ChatCB / Research Browser: PubMed API Integration
// Live search against the National Library of Medicine's E-utilities API.
// Free, no API key required, 3 requests/second rate limit.
//
// Public API:
//   - searchPubMed(query, limit)           → PubMedArticle[] (research browser shape)
//   - searchPubMedWithMeta(query, limit)   → PubMedSearchResult (chatcb legacy shape)
//   - fetchAbstract(pmid)                  → string
//   - classifyTherapeuticStance(title, abs) → stance label
//   - parseEsummaryArticles(data)          → pure parser (used for tests)
//   - parseEfetchAbstracts(xmlText)        → pure parser (used for tests)

/**
 * Shape used by the public Education → Research browser.
 * Matches the task spec: authors is an array, includes abstractSnippet.
 */
export interface PubMedArticle {
  pmid: string;
  title: string;
  abstractSnippet: string;
  authors: string[];
  journal: string;
  year: number;
  url: string;
  doi?: string;
}

/**
 * Legacy aggregate shape used by the ChatCB knowledge-base tab.
 * Kept for backwards compatibility with `src/app/education/actions.ts`.
 */
export interface PubMedSearchResult {
  query: string;
  totalResults: number;
  articles: PubMedArticle[];
  searchTime: number;
}

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

// ─────────────────────────────────────────────────────────────────────────────
// Pure parsers (exported for unit tests — no network)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse the ESummary JSON response into the browser-friendly PubMedArticle
 * shape. Abstract snippets are filled in separately by parseEfetchAbstracts.
 */
export function parseEsummaryArticles(
  data: unknown,
  pmidOrder: string[]
): PubMedArticle[] {
  const results: Record<string, any> = (data as any)?.result ?? {};

  return pmidOrder
    .filter((id) => results[id])
    .map((id) => {
      const r = results[id];
      const authorList: string[] = Array.isArray(r.authors)
        ? r.authors
                      .map((a: any) => (typeof a?.name === "string" ? a.name : ""))
            .filter(Boolean)
        : [];
      const doiRaw: string = typeof r.elocationid === "string" ? r.elocationid : "";
      const doi = doiRaw.replace(/^doi:\s*/i, "").trim();
      const yearStr = typeof r.pubdate === "string" ? r.pubdate.split(" ")[0] : "0";
      const year = parseInt(yearStr, 10);

      return {
        pmid: id,
        title: typeof r.title === "string" ? r.title : "Untitled",
        abstractSnippet: "",
        authors: authorList,
        journal:
          typeof r.fulljournalname === "string"
            ? r.fulljournalname
            : typeof r.source === "string"
              ? r.source
              : "Unknown Journal",
        year: Number.isFinite(year) ? year : 0,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        doi: doi || undefined,
      } satisfies PubMedArticle;
    });
}

/**
 * Parse an EFetch XML payload (rettype=abstract, retmode=xml) into a map of
 * pmid → abstract snippet (first 320 chars, whitespace-normalised).
 *
 * Uses a deliberately small regex-based parser so it works in both Node and
 * Edge runtimes without a DOMParser dependency. PubMed's XML is well-formed
 * and stable in this narrow slice, so regex parsing is acceptable.
 */
export function parseEfetchAbstracts(xmlText: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!xmlText) return out;

  const articleRegex = /<PubmedArticle\b[\s\S]*?<\/PubmedArticle>/g;
  const pmidRegex = /<PMID\b[^>]*>\s*(\d+)\s*<\/PMID>/;
  // AbstractText can appear multiple times (structured abstracts) and may have
  // attributes like Label="RESULTS" — capture inner text of all of them.
  const abstractTextRegex = /<AbstractText\b[^>]*>([\s\S]*?)<\/AbstractText>/g;

  const articles = xmlText.match(articleRegex) ?? [];
  for (const article of articles) {
    const pmidMatch = article.match(pmidRegex);
    if (!pmidMatch) continue;
    const pmid = pmidMatch[1];

    const parts: string[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(abstractTextRegex.source, "g");
    while ((m = re.exec(article)) !== null) {
      parts.push(stripInlineTags(m[1]));
    }

    const full = parts.join(" ").replace(/\s+/g, " ").trim();
    if (full) {
      out[pmid] = full.length > 320 ? full.slice(0, 320).trimEnd() + "…" : full;
    }
  }

  return out;
}

function stripInlineTags(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// ─────────────────────────────────────────────────────────────────────────────
// Live E-utilities calls
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search PubMed and return an array of PubMedArticle records.
 *
 * - Uses ESearch → ESummary → EFetch (for abstracts) pipeline.
 * - Degrades gracefully: on network / parse errors, returns whatever partial
 *   data was collected (often an empty array).
 * - Next.js fetch cache: 1-hour revalidation (E-utilities allows basic GETs
 *   without auth for small traffic).
 */
export async function searchPubMed(
  query: string,
  limit: number = 10
): Promise<PubMedArticle[]> {
  const result = await searchPubMedWithMeta(query, limit);
  return result.articles;
}

/**
 * Same as searchPubMed but returns the aggregate shape (total results + timing)
 * used by the ChatCB knowledge-base tab.
 */
export async function searchPubMedWithMeta(
  query: string,
  limit: number = 10
): Promise<PubMedSearchResult> {
  const start = Date.now();
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: trimmed, totalResults: 0, articles: [], searchTime: 0 };
  }

  const searchUrl =
    `${EUTILS_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(trimmed)}` +
    `&retmax=${Math.max(1, Math.min(50, limit))}&sort=relevance&retmode=json`;

  let pmids: string[] = [];
  let totalResults = 0;

  try {
    const searchRes = await fetch(searchUrl, { next: { revalidate: 3600 } });
    if (!searchRes.ok) throw new Error(`esearch ${searchRes.status}`);
    const searchData = await searchRes.json();
    pmids = searchData?.esearchresult?.idlist ?? [];
    totalResults = parseInt(searchData?.esearchresult?.count ?? "0", 10);
  } catch (err) {
    console.error("[PubMed] ESearch failed:", err);
    return { query: trimmed, totalResults: 0, articles: [], searchTime: Date.now() - start };
  }

  if (pmids.length === 0) {
    return { query: trimmed, totalResults, articles: [], searchTime: Date.now() - start };
  }

  // ESummary — structured metadata
  const summaryUrl = `${EUTILS_BASE}/esummary.fcgi?db=pubmed&id=${pmids.join(",")}&retmode=json`;
  let articles: PubMedArticle[] = [];
  try {
    const summaryRes = await fetch(summaryUrl, { next: { revalidate: 3600 } });
    if (!summaryRes.ok) throw new Error(`esummary ${summaryRes.status}`);
    const summaryData = await summaryRes.json();
    articles = parseEsummaryArticles(summaryData, pmids);
  } catch (err) {
    console.error("[PubMed] ESummary failed:", err);
    return { query: trimmed, totalResults, articles: [], searchTime: Date.now() - start };
  }

  // EFetch — bulk abstracts. Non-fatal: empty snippets if this fails.
  try {
    const fetchUrl = `${EUTILS_BASE}/efetch.fcgi?db=pubmed&id=${pmids.join(",")}&rettype=abstract&retmode=xml`;
    const fetchRes = await fetch(fetchUrl, { next: { revalidate: 3600 } });
    if (fetchRes.ok) {
      const xml = await fetchRes.text();
      const abstracts = parseEfetchAbstracts(xml);
      articles = articles.map((a) => ({
        ...a,
        abstractSnippet: abstracts[a.pmid] ?? a.abstractSnippet,
      }));
    }
  } catch (err) {
    console.error("[PubMed] EFetch abstracts failed (non-fatal):", err);
  }

  return {
    query: trimmed,
    totalResults,
    articles,
    searchTime: Date.now() - start,
  };
}

/**
 * Fetch the abstract for a single PubMed article.
 * Uses EFetch text mode (abstracts aren't in ESummary JSON).
 */
export async function fetchAbstract(pmid: string): Promise<string> {
  const url = `${EUTILS_BASE}/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    const text = await res.text();
    const lines = text.split("\n");
    const abstractStart = lines.findIndex((l) => l.trim() === "") + 1;
    const abstractLines = lines.slice(abstractStart).filter((l) => l.trim());
    return abstractLines.join(" ").trim().slice(0, 2000);
  } catch {
    return "";
  }
}

/**
 * Classify a PubMed article's therapeutic stance using simple heuristics.
 * In production, this would use the MCL NLP model.
 */
export function classifyTherapeuticStance(
  title: string,
  abstract: string
): "positive" | "negative" | "neutral" | "mixed" {
  const text = `${title} ${abstract}`.toLowerCase();

  const positiveTerms = [
    "effective",
    "beneficial",
    "improvement",
    "reduced",
    "relief",
    "therapeutic",
    "promising",
    "significant reduction",
    "well-tolerated",
  ];
  const negativeTerms = [
    "adverse",
    "risk",
    "harmful",
    "no significant",
    "failed",
    "ineffective",
    "dangerous",
    "contraindicated",
    "impairment",
  ];
  const mixedTerms = [
    "mixed results",
    "inconsistent",
    "further research",
    "limited evidence",
    "conflicting",
  ];

  const posCount = positiveTerms.filter((t) => text.includes(t)).length;
  const negCount = negativeTerms.filter((t) => text.includes(t)).length;
  const mixCount = mixedTerms.filter((t) => text.includes(t)).length;

  if (mixCount > 0 && posCount > 0 && negCount > 0) return "mixed";
  if (posCount > negCount + 1) return "positive";
  if (negCount > posCount + 1) return "negative";
  if (posCount > 0 || negCount > 0) return "mixed";
  return "neutral";
}
