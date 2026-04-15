/**
 * Community Resource Connector (EMR-086)
 *
 * Curated database of trusted community organizations that serve patients
 * with specific medical conditions in defined geographic areas.
 *
 * Phase 1 ships with a hand-curated list focused on Orange County, CA
 * (Dr. Patel's home region) and a few national organizations. Phase 2
 * will pull from a broader community resource API and use real
 * geocoding for radius search.
 *
 * Conditions are tagged so the matcher can find resources by ICD-10
 * prefix, plain-language keyword, or condition category.
 */

export type ConditionCategory =
  | "dementia"
  | "cancer"
  | "chronic_pain"
  | "mental_health"
  | "ms"
  | "epilepsy"
  | "ptsd"
  | "addiction"
  | "general";

export interface CommunityResource {
  id: string;
  name: string;
  organization: string;
  category: ConditionCategory[];
  description: string;
  /** What the patient can expect when they reach out */
  whatToExpect: string;
  city: string;
  state: string;
  region?: string; // "Orange County", "Bay Area", etc.
  national?: boolean;
  website: string;
  phone?: string;
  email?: string;
  /** Free or fee-based */
  feeStructure: "free" | "sliding_scale" | "fee_based" | "varies";
  /** Tags for free-text matching */
  tags: string[];
}

export const COMMUNITY_RESOURCES: CommunityResource[] = [
  // ────────────────────────────────────────────────────────────
  // Dementia / Alzheimer's
  // ────────────────────────────────────────────────────────────
  {
    id: "uci-mind",
    name: "UCI MIND (Institute for Memory Impairments and Neurological Disorders)",
    organization: "UC Irvine",
    category: ["dementia"],
    description:
      "World-renowned research and clinical care center for Alzheimer's disease and related dementias. Offers diagnostic evaluation, clinical trials, and family support programs.",
    whatToExpect:
      "Initial evaluation includes cognitive testing, brain imaging, and family interview. Trial participation is optional. Caregivers receive support resources.",
    city: "Irvine",
    state: "CA",
    region: "Orange County",
    website: "https://mind.uci.edu",
    phone: "(949) 824-3253",
    feeStructure: "varies",
    tags: ["alzheimer", "dementia", "memory", "cognitive", "clinical trial"],
  },
  {
    id: "alz-oc",
    name: "Alzheimer's Orange County",
    organization: "Alzheimer's Orange County",
    category: ["dementia"],
    description:
      "Local nonprofit offering free care consultations, support groups, education classes, and respite care for families dealing with Alzheimer's and other dementias.",
    whatToExpect:
      "Free care consultation by phone or in person. They help you understand the disease, navigate care options, and find financial assistance.",
    city: "Irvine",
    state: "CA",
    region: "Orange County",
    website: "https://alzoc.org",
    phone: "(844) 373-4400",
    feeStructure: "free",
    tags: ["alzheimer", "dementia", "support group", "caregiver", "respite"],
  },
  {
    id: "alz-association",
    name: "Alzheimer's Association 24/7 Helpline",
    organization: "Alzheimer's Association",
    category: ["dementia"],
    description:
      "Free 24/7 helpline staffed by master's-level clinicians and specialists in dementia care. Available in 200+ languages.",
    whatToExpect:
      "Call any time for emotional support, crisis intervention, care planning advice, or help finding local resources. They can also connect you with a care consultant.",
    city: "Chicago",
    state: "IL",
    national: true,
    website: "https://www.alz.org",
    phone: "(800) 272-3900",
    feeStructure: "free",
    tags: ["alzheimer", "dementia", "helpline", "24/7"],
  },
  // ────────────────────────────────────────────────────────────
  // Cancer
  // ────────────────────────────────────────────────────────────
  {
    id: "hoag-family-cancer",
    name: "Hoag Family Cancer Institute",
    organization: "Hoag Hospital",
    category: ["cancer"],
    description:
      "Comprehensive cancer center offering integrated medical, surgical, radiation oncology, plus support services including nutrition, integrative medicine, and survivorship programs.",
    whatToExpect:
      "Multidisciplinary team approach. Initial appointment includes care coordinator who helps you navigate the system. Many support groups and free wellness programs.",
    city: "Newport Beach",
    state: "CA",
    region: "Orange County",
    website: "https://www.hoag.org/services/cancer",
    phone: "(949) 764-5543",
    feeStructure: "varies",
    tags: ["cancer", "oncology", "chemotherapy", "radiation", "support"],
  },
  {
    id: "cancer-support-community",
    name: "Cancer Support Community Orange County",
    organization: "Cancer Support Community",
    category: ["cancer"],
    description:
      "Free professional support, education, and hope to people affected by cancer. Programs include support groups, educational workshops, exercise classes, art therapy, and family programs.",
    whatToExpect:
      "All programs are free. Drop in for a tour, meet a counselor, or join a group. No referral needed.",
    city: "Newport Beach",
    state: "CA",
    region: "Orange County",
    website: "https://www.cscoc.org",
    phone: "(949) 252-8255",
    feeStructure: "free",
    tags: ["cancer", "support group", "wellness", "family", "free"],
  },
  // ────────────────────────────────────────────────────────────
  // Chronic Pain
  // ────────────────────────────────────────────────────────────
  {
    id: "us-pain-foundation",
    name: "U.S. Pain Foundation",
    organization: "U.S. Pain Foundation",
    category: ["chronic_pain"],
    description:
      "National nonprofit providing peer support, education, and advocacy for people living with chronic pain. Offers virtual support groups and pain management resources.",
    whatToExpect:
      "Connect with peer support specialists who live with pain themselves. Free virtual programs available nationwide. Excellent educational library.",
    city: "Bellevue",
    state: "WA",
    national: true,
    website: "https://uspainfoundation.org",
    phone: "(800) 910-7140",
    feeStructure: "free",
    tags: ["chronic pain", "support group", "advocacy", "peer support"],
  },
  // ────────────────────────────────────────────────────────────
  // Mental Health
  // ────────────────────────────────────────────────────────────
  {
    id: "nami-oc",
    name: "NAMI Orange County",
    organization: "National Alliance on Mental Illness",
    category: ["mental_health", "ptsd"],
    description:
      "Free mental health support groups, education classes, and advocacy. Programs for individuals, family members, and veterans.",
    whatToExpect:
      "Walk into any peer-led support group with no appointment. Free 8-week Family-to-Family education program for caregivers. NAMI Helpline available weekdays.",
    city: "Santa Ana",
    state: "CA",
    region: "Orange County",
    website: "https://namioc.org",
    phone: "(714) 544-8488",
    feeStructure: "free",
    tags: ["mental health", "depression", "anxiety", "ptsd", "family"],
  },
  {
    id: "988-lifeline",
    name: "988 Suicide & Crisis Lifeline",
    organization: "SAMHSA",
    category: ["mental_health"],
    description:
      "24/7 free and confidential support for people in distress. Call or text 988 from any US phone.",
    whatToExpect:
      "Connects you with a trained counselor in your area. Available 24/7 in English, Spanish, ASL, and 200+ other languages. No charge ever.",
    city: "USA",
    state: "—",
    national: true,
    website: "https://988lifeline.org",
    phone: "988",
    feeStructure: "free",
    tags: ["crisis", "suicide", "mental health", "24/7", "free"],
  },
  // ────────────────────────────────────────────────────────────
  // MS
  // ────────────────────────────────────────────────────────────
  {
    id: "national-ms",
    name: "National MS Society — Pacific South Coast Chapter",
    organization: "National Multiple Sclerosis Society",
    category: ["ms"],
    description:
      "Education, support, and advocacy for people with multiple sclerosis. Offers MS Navigator Service, financial assistance, and local support groups.",
    whatToExpected:
      "Call MS Navigator Service for personalized help: insurance, treatment options, local support, and emotional support. Free.",
    whatToExpect:
      "Call MS Navigator Service for personalized help: insurance, treatment options, local support, and emotional support. Free.",
    city: "Pasadena",
    state: "CA",
    region: "Southern California",
    website: "https://www.nationalmssociety.org",
    phone: "(800) 344-4867",
    feeStructure: "free",
    tags: ["multiple sclerosis", "ms", "navigator", "support"],
  } as any,
  // ────────────────────────────────────────────────────────────
  // Veterans / PTSD
  // ────────────────────────────────────────────────────────────
  {
    id: "va-long-beach",
    name: "VA Long Beach Healthcare System",
    organization: "U.S. Department of Veterans Affairs",
    category: ["ptsd", "mental_health", "chronic_pain"],
    description:
      "Comprehensive VA healthcare for veterans in Orange County and South LA. Includes PTSD specialty care, pain management, and integrative health programs.",
    whatToExpect:
      "Veterans must be enrolled. Mental health is one of the easiest entry points. Same-day mental health care is now available at most VA facilities.",
    city: "Long Beach",
    state: "CA",
    region: "Orange County",
    website: "https://www.va.gov/long-beach-health-care/",
    phone: "(562) 826-8000",
    feeStructure: "free",
    tags: ["veteran", "ptsd", "va", "military", "pain", "mental health"],
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ResourceMatchInput {
  /** Patient state code, e.g. "CA" */
  state?: string | null;
  /** Patient city or region for proximity matching */
  city?: string | null;
  /** Patient ZIP if available */
  zip?: string | null;
  /** Free-text search across presenting concerns / chart summary */
  conditionText?: string | null;
  /** Categories the patient is known to need */
  categories?: ConditionCategory[];
}

export interface ResourceMatch {
  resource: CommunityResource;
  matchScore: number; // 0-100
  matchedOn: string[];
}

/**
 * Find community resources that match a patient's location and needs.
 * Returns a sorted list of matches with scores and reasons.
 */
export function findResources(input: ResourceMatchInput): ResourceMatch[] {
  const results: ResourceMatch[] = [];
  const conditionText = (input.conditionText ?? "").toLowerCase();
  const stateCode = (input.state ?? "").toUpperCase();

  for (const r of COMMUNITY_RESOURCES) {
    let score = 0;
    const reasons: string[] = [];

    // Geographic match (heavy weight)
    if (r.national) {
      score += 30;
      reasons.push("national resource");
    } else if (stateCode === r.state) {
      score += 50;
      reasons.push(`in ${r.state}`);
      // Bonus if same region/city
      if (input.city && r.city.toLowerCase().includes(input.city.toLowerCase())) {
        score += 20;
        reasons.push(`in ${r.city}`);
      }
    } else if (stateCode && stateCode !== r.state) {
      // Out of state — only national resources should match
      continue;
    } else {
      // No state specified — give national + CA resources a chance
      score += r.national ? 20 : 10;
    }

    // Category match
    if (input.categories && input.categories.length > 0) {
      const overlap = r.category.filter((c) =>
        input.categories!.includes(c),
      );
      if (overlap.length > 0) {
        score += 30 * overlap.length;
        reasons.push(`treats ${overlap.join(", ")}`);
      }
    }

    // Free-text condition match
    if (conditionText) {
      const matchedTags = r.tags.filter((t) =>
        conditionText.includes(t.toLowerCase()),
      );
      if (matchedTags.length > 0) {
        score += 15 * matchedTags.length;
        reasons.push(`matches "${matchedTags[0]}"`);
      }
    }

    // Free programs get a small boost
    if (r.feeStructure === "free") score += 5;

    if (score > 0) {
      results.push({ resource: r, matchScore: Math.min(100, score), matchedOn: reasons });
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Try to detect condition categories from free-text patient concerns.
 * Heuristic, not perfect — but gives the matcher a strong starting signal.
 */
export function detectCategories(text: string | null | undefined): ConditionCategory[] {
  if (!text) return [];
  const t = text.toLowerCase();
  const cats: ConditionCategory[] = [];
  if (/dementia|alzheimer|memory loss|cognitive decline/.test(t)) cats.push("dementia");
  if (/cancer|tumor|oncology|chemo|carcinoma|leukemia|lymphoma/.test(t)) cats.push("cancer");
  if (/chronic pain|fibromyalgia|back pain|neuropath/.test(t)) cats.push("chronic_pain");
  if (/anxiety|depression|bipolar|mental health|panic/.test(t)) cats.push("mental_health");
  if (/multiple sclerosis|\bms\b/.test(t)) cats.push("ms");
  if (/epilepsy|seizure/.test(t)) cats.push("epilepsy");
  if (/ptsd|post.?traumatic|trauma/.test(t)) cats.push("ptsd");
  if (/addiction|substance use|alcohol|opioid use/.test(t)) cats.push("addiction");
  return cats;
}
