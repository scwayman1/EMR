// EMR-202 — curated research library shown on the patient education
// research page. Pure static data so the page can render at the edge.
//
// Topics roughly mirror the symptom buckets used elsewhere in the
// portal so a patient who lands here from a Combo Wheel selection
// recognises the categories. Add new entries by appending — the IDs
// are stable so deep-links from notifications survive churn.

export type ResearchTopicId =
  | "sleep"
  | "pain"
  | "anxiety"
  | "cancer"
  | "neurological"
  | "inflammation"
  | "general";

export interface ResearchTopic {
  id: ResearchTopicId;
  label: string;
}

export const RESEARCH_TOPICS: ResearchTopic[] = [
  { id: "sleep", label: "Sleep" },
  { id: "pain", label: "Pain" },
  { id: "anxiety", label: "Anxiety" },
  { id: "cancer", label: "Cancer" },
  { id: "neurological", label: "Neurological" },
  { id: "inflammation", label: "Inflammation" },
  { id: "general", label: "General" },
];

export interface ResearchArticle {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal?: string;
  topic: ResearchTopicId;
  summary: string;
  pdfUrl: string;
  pmid?: string;
  evidence: "strong" | "moderate" | "emerging";
}

export const KANDER_SPOTLIGHT = {
  title: "Cannabis and Cancer",
  summary:
    "Justin Kander's free, peer-reference-rich overview of cannabis as supportive cancer care — covering symptom relief, dosing, drug interactions, and patient-reported outcomes. The single best free starting point for patients new to medicinal cannabis.",
  pdfUrl:
    "https://archive.org/download/cannabis-and-cannabinoids-in-cancer-treatment/CannabisAndCancer-JustinKander.pdf",
  webUrl: "https://www.cannabisandcancer.com/",
  highlights: [
    "Patient-friendly",
    "Heavily cited",
    "Symptom + outcome focus",
    "Free PDF",
  ],
} as const;

export const RESEARCH_LIBRARY: ResearchArticle[] = [
  {
    id: "kander-2023-cannabis-cancer",
    title: "Cannabis and Cannabinoids in Cancer Treatment",
    authors: "Kander J.",
    year: 2023,
    topic: "cancer",
    summary:
      "Comprehensive layperson-accessible review of cannabis's role in cancer symptom management, including pain, nausea, appetite, sleep, and quality-of-life outcomes.",
    pdfUrl: KANDER_SPOTLIGHT.pdfUrl,
    evidence: "strong",
  },
  {
    id: "babson-2017-sleep",
    title: "Cannabis, Cannabinoids, and Sleep: a Review of the Literature",
    authors: "Babson KA, Sottile J, Morabito D.",
    year: 2017,
    journal: "Curr Psychiatry Rep",
    topic: "sleep",
    summary:
      "Reviews how THC, CBD, and cannabinoid combinations affect sleep architecture. Short-term THC use shortens sleep latency; CBD shows dose-dependent effects on sleep quality.",
    pdfUrl: "https://pubmed.ncbi.nlm.nih.gov/28349316/",
    pmid: "28349316",
    evidence: "moderate",
  },
  {
    id: "shannon-2019-anxiety-sleep",
    title:
      "Cannabidiol in Anxiety and Sleep: A Large Case Series",
    authors: "Shannon S, Lewis N, Lee H, Hughes S.",
    year: 2019,
    journal: "Perm J",
    topic: "anxiety",
    summary:
      "Open-label retrospective case series of 72 adults — anxiety scores decreased in 79% within the first month of CBD treatment; sleep scores improved in 67%.",
    pdfUrl: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6326553/",
    pmid: "30624194",
    evidence: "moderate",
  },
  {
    id: "boehnke-2016-pain",
    title:
      "Medical Cannabis Use Is Associated With Decreased Opiate Medication Use",
    authors: "Boehnke KF, Litinas E, Clauw DJ.",
    year: 2016,
    journal: "J Pain",
    topic: "pain",
    summary:
      "In 244 chronic pain patients, medical cannabis use was associated with a 64% decrease in opioid use and improved quality-of-life scores.",
    pdfUrl: "https://pubmed.ncbi.nlm.nih.gov/27001005/",
    pmid: "27001005",
    evidence: "strong",
  },
  {
    id: "aviram-2017-pain-meta",
    title: "Efficacy of Cannabis-Based Medicines for Pain Management",
    authors: "Aviram J, Samuelly-Leichtag G.",
    year: 2017,
    journal: "Pain Physician",
    topic: "pain",
    summary:
      "Meta-analysis of 43 RCTs (2,437 patients). Cannabis-based medicines yielded a small but statistically significant benefit for chronic neuropathic pain.",
    pdfUrl: "https://pubmed.ncbi.nlm.nih.gov/28934780/",
    pmid: "28934780",
    evidence: "strong",
  },
  {
    id: "devinsky-2018-epidiolex",
    title: "Cannabidiol in Patients with Treatment-Resistant Epilepsy",
    authors: "Devinsky O, Cross JH, Laux L, et al.",
    year: 2017,
    journal: "N Engl J Med",
    topic: "neurological",
    summary:
      "Pivotal RCT in Dravet syndrome: CBD reduced convulsive seizure frequency by 23 percentage points more than placebo. Established the efficacy basis for FDA approval of Epidiolex.",
    pdfUrl: "https://www.nejm.org/doi/full/10.1056/NEJMoa1611618",
    pmid: "28538134",
    evidence: "strong",
  },
  {
    id: "atalay-2020-cbd-inflammation",
    title: "Antioxidative and Anti-Inflammatory Properties of Cannabidiol",
    authors: "Atalay S, Jarocka-Karpowicz I, Skrzydlewska E.",
    year: 2020,
    journal: "Antioxidants (Basel)",
    topic: "inflammation",
    summary:
      "Review of preclinical and clinical evidence for CBD's anti-inflammatory mechanisms via PPARγ, adenosine, and 5-HT1A pathways.",
    pdfUrl: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7023045/",
    pmid: "31878449",
    evidence: "moderate",
  },
  {
    id: "russo-2011-entourage",
    title:
      "Taming THC: potential cannabis synergy and phytocannabinoid-terpenoid entourage effects",
    authors: "Russo EB.",
    year: 2011,
    journal: "Br J Pharmacol",
    topic: "general",
    summary:
      "Foundational review on the entourage effect — how terpenes (myrcene, linalool, pinene, caryophyllene) modify cannabinoid effects. Cited heavily in modern formulation work.",
    pdfUrl: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3165946/",
    pmid: "21749363",
    evidence: "moderate",
  },
];
