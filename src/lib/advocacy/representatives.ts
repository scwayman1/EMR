/**
 * EMR-087 — Legislative Advocacy Portal.
 *
 * Helpers that map a patient's state to their federal + state
 * representatives and render a personalized advocacy letter the
 * patient can review and send through the portal. Real deployments
 * swap `lookupRepresentatives` for a Google Civic / OpenStates call;
 * the seed table here keeps the shape stable and the UI testable.
 */

export type Chamber = "us_senate" | "us_house" | "state_senate" | "state_assembly";

export type AdvocacyAsk =
  | "reclassification"
  | "research_funding"
  | "insurance_coverage"
  | "patient_access"
  | "veteran_access";

export interface Representative {
  id: string;
  name: string;
  chamber: Chamber;
  state: string;
  /** Federal district or state district number; omitted for senators. */
  district?: number;
  party: "D" | "R" | "I";
  emailUrl: string;
  /** Optional phone for the patient who'd rather call. */
  phone?: string;
}

export interface PatientStory {
  firstName: string;
  state: string;
  /** ICD-10 or plain-text problem the patient is treating with cannabis. */
  condition: string;
  /** One-sentence story in the patient's own voice. */
  story: string;
}

export interface LetterTemplate {
  ask: AdvocacyAsk;
  title: string;
  callToAction: string;
  /**
   * Static body paragraphs that come before the personalized story.
   * Kept short so the letter reads as the patient's voice with a
   * factual frame around it.
   */
  framing: string[];
}

const TEMPLATES: Record<AdvocacyAsk, LetterTemplate> = {
  reclassification: {
    ask: "reclassification",
    title: "Reclassify cannabis under the Controlled Substances Act",
    callToAction:
      "Please support legislation that reschedules cannabis to reflect its accepted medical use.",
    framing: [
      "Cannabis is currently a Schedule I substance, which means federal law still classifies it as having no accepted medical use.",
      "That classification stands in the way of clinical research, banking, and insurance coverage for the patients who already rely on it.",
    ],
  },
  research_funding: {
    ask: "research_funding",
    title: "Fund cannabis clinical research",
    callToAction:
      "Please support increased NIH and VA funding for cannabis clinical research and outcomes registries.",
    framing: [
      "We still do not have the same level of high-quality clinical trials for cannabis that we have for other widely used medicines.",
      "Funding rigorous research is the fastest way to close the evidence gap and protect patients.",
    ],
  },
  insurance_coverage: {
    ask: "insurance_coverage",
    title: "Cover medical cannabis under public and private insurance",
    callToAction:
      "Please support legislation that allows insurers to cover physician-recommended medical cannabis.",
    framing: [
      "Today, patients pay for medical cannabis entirely out of pocket — even when it's the only treatment that has worked for them.",
      "Coverage parity would reduce reliance on opioids and lower the cost of chronic-condition care.",
    ],
  },
  patient_access: {
    ask: "patient_access",
    title: "Protect patient access at the state level",
    callToAction:
      "Please support measures that preserve or expand patient access to physician-recommended cannabis.",
    framing: [
      "Patients in our state rely on the medical program to manage chronic conditions that other medicines have not helped.",
      "Restrictions that limit physician judgement or product variety push patients to the illicit market.",
    ],
  },
  veteran_access: {
    ask: "veteran_access",
    title: "Veteran access to medical cannabis",
    callToAction:
      "Please support legislation that lets VA clinicians discuss and recommend medical cannabis within VA care.",
    framing: [
      "Veterans use medical cannabis for service-connected conditions like PTSD and chronic pain.",
      "Current VA rules force veterans to choose between their VA care team and the treatment that's working.",
    ],
  },
};

/**
 * Curated demo registry. Real deployments hit Google Civic or
 * OpenStates with the patient's address; the structure stays the same.
 */
const SEED_REPS: Representative[] = [
  // California — federal
  { id: "us-sen-ca-1", name: "Sen. Alex Padilla", chamber: "us_senate", state: "CA", party: "D", emailUrl: "https://www.padilla.senate.gov/contact/" },
  { id: "us-sen-ca-2", name: "Sen. Laphonza Butler", chamber: "us_senate", state: "CA", party: "D", emailUrl: "https://www.butler.senate.gov/contact/" },
  { id: "us-rep-ca-45", name: "Rep. Michelle Steel (CA-45)", chamber: "us_house", state: "CA", district: 45, party: "R", emailUrl: "https://steel.house.gov/contact" },
  // California — state
  { id: "ca-sen-37", name: "Sen. Steven Choi (SD-37)", chamber: "state_senate", state: "CA", district: 37, party: "R", emailUrl: "https://sd37.senate.ca.gov/contact" },
  // Colorado — federal
  { id: "us-sen-co-1", name: "Sen. John Hickenlooper", chamber: "us_senate", state: "CO", party: "D", emailUrl: "https://www.hickenlooper.senate.gov/contact/" },
  { id: "us-sen-co-2", name: "Sen. Michael Bennet", chamber: "us_senate", state: "CO", party: "D", emailUrl: "https://www.bennet.senate.gov/public/index.cfm/contact" },
  { id: "us-rep-co-2", name: "Rep. Joe Neguse (CO-2)", chamber: "us_house", state: "CO", district: 2, party: "D", emailUrl: "https://neguse.house.gov/contact" },
  // New York — federal
  { id: "us-sen-ny-1", name: "Sen. Chuck Schumer", chamber: "us_senate", state: "NY", party: "D", emailUrl: "https://www.schumer.senate.gov/contact/email-chuck" },
  { id: "us-sen-ny-2", name: "Sen. Kirsten Gillibrand", chamber: "us_senate", state: "NY", party: "D", emailUrl: "https://www.gillibrand.senate.gov/contact/" },
  { id: "us-rep-ny-12", name: "Rep. Jerrold Nadler (NY-12)", chamber: "us_house", state: "NY", district: 12, party: "D", emailUrl: "https://nadler.house.gov/contact/" },
  // Texas — federal
  { id: "us-sen-tx-1", name: "Sen. Ted Cruz", chamber: "us_senate", state: "TX", party: "R", emailUrl: "https://www.cruz.senate.gov/contact" },
  { id: "us-sen-tx-2", name: "Sen. John Cornyn", chamber: "us_senate", state: "TX", party: "R", emailUrl: "https://www.cornyn.senate.gov/contact/" },
];

export function lookupRepresentatives(state: string): Representative[] {
  const code = state.toUpperCase().slice(0, 2);
  return SEED_REPS.filter((r) => r.state === code);
}

export function listAsks(): LetterTemplate[] {
  return Object.values(TEMPLATES);
}

export function getTemplate(ask: AdvocacyAsk): LetterTemplate {
  return TEMPLATES[ask];
}

export interface RenderedLetter {
  subject: string;
  body: string;
  /** Character count is useful for the SMS-shaped fallback. */
  characters: number;
}

/**
 * Compose the patient's letter. The framing paragraphs are appended
 * verbatim, the personal story slots in the middle, and the call to
 * action closes the letter. The patient can edit any of it before
 * sending — this is the *seed*, not the final draft.
 */
export function renderLetter(
  rep: Representative,
  story: PatientStory,
  ask: AdvocacyAsk,
): RenderedLetter {
  const tpl = TEMPLATES[ask];
  const greeting = `Dear ${rep.name.split(" (")[0]},`;
  const intro = `My name is ${story.firstName}, and I am a constituent from ${story.state}. I am writing to ask for your support on a question that affects me and my family directly.`;

  const personal = `I live with ${story.condition}. ${story.story}`;
  const close =
    `Thank you for taking the time to read this letter. I am happy to share more about my experience if it would help shape your decision.`;

  const body = [
    greeting,
    "",
    intro,
    "",
    ...tpl.framing,
    "",
    personal,
    "",
    tpl.callToAction,
    "",
    close,
    "",
    `Sincerely,`,
    story.firstName,
  ].join("\n");

  return {
    subject: `${story.state} constituent — ${tpl.title}`,
    body,
    characters: body.length,
  };
}
