import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseEsummaryArticles,
  parseEfetchAbstracts,
  searchPubMed,
  searchPubMedWithMeta,
} from "./pubmed";

// ─────────────────────────────────────────────────────────────────────────────
// Pure parsers
// ─────────────────────────────────────────────────────────────────────────────

describe("parseEsummaryArticles", () => {
  it("maps ESummary JSON into PubMedArticle[] in the requested pmid order", () => {
    const data = {
      result: {
        "40000001": {
          title: "CBD for chronic pain",
          authors: [{ name: "Smith J" }, { name: "Doe A" }],
          fulljournalname: "Journal of Cannabis Research",
          source: "J Cannabis Res",
          pubdate: "2024 Mar",
          elocationid: "doi: 10.1186/example",
        },
        "40000002": {
          title: "THC and sleep",
          authors: [
            { name: "Lee K" },
            { name: "Park S" },
            { name: "Kim H" },
            { name: "Choi B" },
          ],
          source: "Sleep Med",
          pubdate: "2023",
          elocationid: "",
        },
      },
    };

    const articles = parseEsummaryArticles(data, ["40000001", "40000002"]);

    expect(articles).toHaveLength(2);
    expect(articles[0]).toMatchObject({
      pmid: "40000001",
      title: "CBD for chronic pain",
      authors: ["Smith J", "Doe A"],
      journal: "Journal of Cannabis Research",
      year: 2024,
      url: "https://pubmed.ncbi.nlm.nih.gov/40000001/",
      doi: "10.1186/example",
      abstractSnippet: "",
    });
    expect(articles[1]).toMatchObject({
      pmid: "40000002",
      title: "THC and sleep",
      authors: ["Lee K", "Park S", "Kim H", "Choi B"],
      journal: "Sleep Med",
      year: 2023,
    });
    expect(articles[1].doi).toBeUndefined();
  });

  it("skips pmids that have no corresponding result record", () => {
    const data = { result: { "1": { title: "one", pubdate: "2020" } } };
    const articles = parseEsummaryArticles(data, ["1", "missing"]);
    expect(articles).toHaveLength(1);
    expect(articles[0].pmid).toBe("1");
  });

  it("falls back gracefully for malformed / missing fields", () => {
    const data = {
      result: {
        "1": {}, // no title, no authors, no pubdate
      },
    };
    const articles = parseEsummaryArticles(data, ["1"]);
    expect(articles[0]).toMatchObject({
      pmid: "1",
      title: "Untitled",
      authors: [],
      journal: "Unknown Journal",
      year: 0,
    });
  });
});

describe("parseEfetchAbstracts", () => {
  it("extracts abstracts keyed by PMID and joins structured sections", () => {
    const xml = `<?xml version="1.0"?>
      <PubmedArticleSet>
        <PubmedArticle>
          <MedlineCitation>
            <PMID Version="1">123</PMID>
            <Article>
              <Abstract>
                <AbstractText Label="BACKGROUND">Cannabis is widely studied.</AbstractText>
                <AbstractText Label="RESULTS">CBD showed benefit.</AbstractText>
              </Abstract>
            </Article>
          </MedlineCitation>
        </PubmedArticle>
        <PubmedArticle>
          <MedlineCitation>
            <PMID Version="1">456</PMID>
            <Article>
              <Abstract>
                <AbstractText>Plain unstructured abstract here.</AbstractText>
              </Abstract>
            </Article>
          </MedlineCitation>
        </PubmedArticle>
      </PubmedArticleSet>`;

    const map = parseEfetchAbstracts(xml);
    expect(map["123"]).toBe("Cannabis is widely studied. CBD showed benefit.");
    expect(map["456"]).toBe("Plain unstructured abstract here.");
  });

  it("truncates very long abstracts to ~320 chars with an ellipsis", () => {
    const long = "word ".repeat(200); // 1000+ chars
    const xml = `
      <PubmedArticleSet>
        <PubmedArticle>
          <PMID>9</PMID>
          <AbstractText>${long}</AbstractText>
        </PubmedArticle>
      </PubmedArticleSet>`;
    const map = parseEfetchAbstracts(xml);
    expect(map["9"].length).toBeLessThanOrEqual(321 + 1); // snippet + ellipsis char
    expect(map["9"].endsWith("…")).toBe(true);
  });

  it("returns an empty map for empty / invalid XML", () => {
    expect(parseEfetchAbstracts("")).toEqual({});
    expect(parseEfetchAbstracts("<not-pubmed/>")).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration (fetch-mocked)
// ─────────────────────────────────────────────────────────────────────────────

describe("searchPubMed (network-mocked)", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns a PubMedArticle[] in the shape the research browser expects", async () => {
    const esearch = {
      esearchresult: { idlist: ["11", "22"], count: "2" },
    };
    const esummary = {
      result: {
        "11": {
          title: "CBD and anxiety",
          authors: [{ name: "Alpha A" }],
          fulljournalname: "Cannabis Journal",
          pubdate: "2022 Jan",
          elocationid: "doi: 10.1/abc",
        },
        "22": {
          title: "THC and pain",
          authors: [{ name: "Beta B" }, { name: "Gamma C" }],
          source: "Pain Med",
          pubdate: "2021",
          elocationid: "",
        },
      },
    };
    const efetchXml = `
      <PubmedArticleSet>
        <PubmedArticle>
          <PMID>11</PMID>
          <AbstractText>Anxiety findings.</AbstractText>
        </PubmedArticle>
        <PubmedArticle>
          <PMID>22</PMID>
          <AbstractText>Pain findings.</AbstractText>
        </PubmedArticle>
      </PubmedArticleSet>`;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => esearch })
      .mockResolvedValueOnce({ ok: true, json: async () => esummary })
      .mockResolvedValueOnce({ ok: true, text: async () => efetchXml });
    global.fetch = fetchMock as unknown as typeof fetch;

    const articles = await searchPubMed("cannabis chronic pain", 2);

    expect(articles).toHaveLength(2);
    expect(articles[0].authors).toEqual(["Alpha A"]);
    expect(articles[0].abstractSnippet).toBe("Anxiety findings.");
    expect(articles[1].abstractSnippet).toBe("Pain findings.");
    expect(articles[1].url).toBe("https://pubmed.ncbi.nlm.nih.gov/22/");
    // Ensure we called esearch / esummary / efetch in that order
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls[0]).toContain("esearch.fcgi");
    expect(urls[1]).toContain("esummary.fcgi");
    expect(urls[2]).toContain("efetch.fcgi");
  });

  it("returns an empty array on esearch failure (graceful degradation)", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("boom")) as unknown as typeof fetch;
    const articles = await searchPubMed("anything", 5);
    expect(articles).toEqual([]);
  });

  it("returns partial data when efetch fails (abstract-less articles)", async () => {
    const esearch = { esearchresult: { idlist: ["1"], count: "1" } };
    const esummary = {
      result: {
        "1": {
          title: "Partial",
          authors: [{ name: "X" }],
          source: "J",
          pubdate: "2020",
        },
      },
    };
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => esearch })
      .mockResolvedValueOnce({ ok: true, json: async () => esummary })
      .mockRejectedValueOnce(new Error("efetch down")) as unknown as typeof fetch;

    const result = await searchPubMedWithMeta("x", 1);
    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].abstractSnippet).toBe(""); // efetch failed but we still got metadata
    expect(result.totalResults).toBe(1);
  });

  it("returns empty result for an empty query without calling fetch", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const result = await searchPubMedWithMeta("   ", 10);
    expect(result.articles).toEqual([]);
    expect(result.totalResults).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
