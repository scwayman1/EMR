// E-Consent Form Builder — EMR-179
// Customizable consent forms with patient e-signature.

export type ConsentFieldType = "text" | "checkbox" | "signature" | "date" | "paragraph" | "acknowledgment";

export interface ConsentField {
  id: string;
  type: ConsentFieldType;
  label: string;
  required: boolean;
  content?: string; // For paragraph/acknowledgment blocks
  placeholder?: string;
}

export interface ConsentTemplate {
  id: string;
  name: string;
  description: string;
  category: "treatment" | "privacy" | "telehealth" | "research" | "cannabis" | "general";
  version: string;
  fields: ConsentField[];
  legalText: string;
  createdAt: string;
}

export interface SignedConsent {
  id: string;
  templateId: string;
  templateName: string;
  patientId: string;
  patientName: string;
  responses: Record<string, string | boolean>;
  signedAt: string;
  signatureData?: string; // base64 signature image
  ipAddress?: string;
  userAgent?: string;
}

// ── Default templates ──────────────────────────────────

export const DEFAULT_TEMPLATES: ConsentTemplate[] = [
  {
    id: "consent-treatment",
    name: "General Treatment Consent",
    description: "Consent for medical treatment and evaluation",
    category: "treatment",
    version: "1.0",
    legalText: "I understand that the practice of medicine is not an exact science and that no guarantees have been made about the results of treatment.",
    fields: [
      { id: "f1", type: "paragraph", label: "Treatment Consent", required: false, content: "I hereby consent to the medical treatment and evaluation recommended by my healthcare provider. I understand that cannabis medicine involves ongoing evaluation and dosage adjustment." },
      { id: "f2", type: "acknowledgment", label: "I understand the nature of the proposed treatment", required: true, content: "I have been informed about the nature, risks, benefits, and alternatives to the proposed treatment plan, including cannabis-based therapies." },
      { id: "f3", type: "acknowledgment", label: "I understand the risks and side effects", required: true, content: "I have been informed of potential side effects of cannabis-based treatments including drowsiness, dizziness, dry mouth, anxiety, and cognitive changes." },
      { id: "f4", type: "acknowledgment", label: "I will follow dosing instructions", required: true, content: "I agree to follow the dosing instructions provided by my physician and to not exceed recommended doses without medical guidance." },
      { id: "f5", type: "acknowledgment", label: "I will not drive while impaired", required: true, content: "I understand that cannabis may impair my ability to drive or operate machinery, and I agree not to do so while under the influence." },
      { id: "f6", type: "signature", label: "Patient signature", required: true },
      { id: "f7", type: "date", label: "Date", required: true },
    ],
    createdAt: "2026-01-01",
  },
  {
    id: "consent-hipaa",
    name: "HIPAA Privacy Notice",
    description: "Notice of privacy practices and patient acknowledgment",
    category: "privacy",
    version: "1.0",
    legalText: "This notice describes how medical information about you may be used and disclosed, and how you can access this information.",
    fields: [
      { id: "h1", type: "paragraph", label: "Privacy Notice", required: false, content: "We are committed to protecting your health information. We will use and disclose your protected health information (PHI) only in accordance with HIPAA regulations." },
      { id: "h2", type: "acknowledgment", label: "I have received the Notice of Privacy Practices", required: true, content: "I acknowledge that I have received a copy of this practice's Notice of Privacy Practices." },
      { id: "h3", type: "acknowledgment", label: "I understand my rights regarding my health information", required: true, content: "I understand my right to request restrictions on how my information is used, to receive communications by alternative means, and to access and amend my records." },
      { id: "h4", type: "signature", label: "Patient signature", required: true },
      { id: "h5", type: "date", label: "Date", required: true },
    ],
    createdAt: "2026-01-01",
  },
  {
    id: "consent-telehealth",
    name: "Telehealth Consent",
    description: "Consent for receiving care via telehealth/video visits",
    category: "telehealth",
    version: "1.0",
    legalText: "Telehealth involves the use of electronic communications to enable healthcare providers at different locations to share medical information for the purpose of improving patient care.",
    fields: [
      { id: "t1", type: "paragraph", label: "Telehealth Services", required: false, content: "This consent covers the use of telehealth technology (video, audio, electronic messaging) for medical evaluation, diagnosis, and treatment." },
      { id: "t2", type: "acknowledgment", label: "I understand telehealth limitations", required: true, content: "I understand that telehealth has limitations, including potential technology failures, and that in-person visits may be necessary for certain examinations." },
      { id: "t3", type: "acknowledgment", label: "I consent to video recording if applicable", required: false, content: "I consent to the recording of telehealth sessions if my provider deems it clinically necessary, with the understanding that recordings are protected under HIPAA." },
      { id: "t4", type: "acknowledgment", label: "I am in a private location", required: true, content: "I agree to participate in telehealth sessions from a private location where my conversation cannot be overheard." },
      { id: "t5", type: "signature", label: "Patient signature", required: true },
      { id: "t6", type: "date", label: "Date", required: true },
    ],
    createdAt: "2026-01-01",
  },
  {
    id: "consent-cannabis",
    name: "Cannabis Treatment Consent",
    description: "Specific consent for medical cannabis treatment program",
    category: "cannabis",
    version: "1.0",
    legalText: "Medical cannabis is legal in this state but remains a Schedule I substance under federal law. This consent covers the specific risks and responsibilities of participating in a medical cannabis treatment program.",
    fields: [
      { id: "c1", type: "paragraph", label: "Cannabis Treatment Program", required: false, content: "You are being evaluated for participation in a medical cannabis treatment program. Please review and acknowledge the following:" },
      { id: "c2", type: "acknowledgment", label: "Federal law conflict", required: true, content: "I understand that cannabis remains classified as a Schedule I controlled substance under federal law, even though it may be legal in my state." },
      { id: "c3", type: "acknowledgment", label: "Drug testing impact", required: true, content: "I understand that using medical cannabis may cause me to test positive on drug screenings, which could affect my employment." },
      { id: "c4", type: "acknowledgment", label: "No guarantee of benefits", required: true, content: "I understand that the benefits of medical cannabis are not guaranteed, and that my provider will work with me to adjust my treatment plan as needed." },
      { id: "c5", type: "acknowledgment", label: "Pregnancy warning", required: true, content: "I understand that cannabis use during pregnancy or breastfeeding is not recommended and may harm the developing fetus or infant." },
      { id: "c6", type: "acknowledgment", label: "Safe storage", required: true, content: "I agree to store all cannabis products safely, out of reach of children and pets, and in compliance with my state's regulations." },
      { id: "c7", type: "acknowledgment", label: "I will not share my medication", required: true, content: "I understand that sharing my prescribed cannabis products with others is illegal and I agree not to do so." },
      { id: "c8", type: "signature", label: "Patient signature", required: true },
      { id: "c9", type: "date", label: "Date", required: true },
    ],
    createdAt: "2026-01-01",
  },
];

export function getTemplatesByCategory(category?: string): ConsentTemplate[] {
  if (!category) return DEFAULT_TEMPLATES;
  return DEFAULT_TEMPLATES.filter((t) => t.category === category);
}
