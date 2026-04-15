// State Compliance Reporting — auto-generated state cannabis forms
// Each state has different reporting requirements for medical cannabis programs.

export interface StateFormTemplate {
  stateCode: string;
  stateName: string;
  formName: string;
  formId: string;
  description: string;
  requiredFields: StateFormField[];
  renewalPeriodDays: number;
  url?: string;
}

export interface StateFormField {
  key: string;
  label: string;
  type: "text" | "date" | "select" | "checkbox" | "number" | "icd10" | "signature";
  required: boolean;
  source?: string; // e.g., "patient.firstName", "encounter.serviceDate"
  options?: string[];
}

export interface GeneratedStateForm {
  templateId: string;
  stateCode: string;
  formName: string;
  patientId: string;
  encounterId?: string;
  generatedAt: string;
  fields: Record<string, string | boolean | number>;
  status: "draft" | "complete" | "submitted";
  signedBy?: string;
  signedAt?: string;
}

// ── State form templates ───────────────────────────────

export const STATE_FORMS: StateFormTemplate[] = [
  {
    stateCode: "CA",
    stateName: "California",
    formName: "Physician's Recommendation",
    formId: "ca-rec-001",
    description: "Written recommendation for medical cannabis use under Proposition 215 / SB 420",
    renewalPeriodDays: 365,
    requiredFields: [
      { key: "patientName", label: "Patient full name", type: "text", required: true, source: "patient.fullName" },
      { key: "patientDob", label: "Date of birth", type: "date", required: true, source: "patient.dateOfBirth" },
      { key: "patientAddress", label: "Patient address", type: "text", required: true, source: "patient.address" },
      { key: "diagnosisCode", label: "Qualifying condition (ICD-10)", type: "icd10", required: true },
      { key: "diagnosisDescription", label: "Condition description", type: "text", required: true },
      { key: "recommendationDate", label: "Date of recommendation", type: "date", required: true, source: "encounter.serviceDate" },
      { key: "expirationDate", label: "Expiration date", type: "date", required: true },
      { key: "dosageGuidance", label: "Recommended dosage/form", type: "text", required: false },
      { key: "physicianName", label: "Physician name", type: "text", required: true, source: "provider.fullName" },
      { key: "physicianLicense", label: "Medical license number", type: "text", required: true },
      { key: "physicianSignature", label: "Physician signature", type: "signature", required: true },
    ],
  },
  {
    stateCode: "FL",
    stateName: "Florida",
    formName: "Physician Certification for Medical Marijuana",
    formId: "fl-cert-001",
    description: "Required certification under Florida's Medical Marijuana Legalization Initiative (Amendment 2)",
    renewalPeriodDays: 210,
    requiredFields: [
      { key: "patientName", label: "Patient full name", type: "text", required: true, source: "patient.fullName" },
      { key: "patientDob", label: "Date of birth", type: "date", required: true, source: "patient.dateOfBirth" },
      { key: "patientId", label: "Patient ID number", type: "text", required: true, source: "patient.id" },
      { key: "qualifyingCondition", label: "Qualifying condition", type: "select", required: true, options: ["Cancer", "Epilepsy", "Glaucoma", "HIV/AIDS", "PTSD", "ALS", "Crohn's disease", "Parkinson's disease", "Multiple sclerosis", "Chronic nonmalignant pain", "Terminal condition"] },
      { key: "diagnosisCode", label: "ICD-10 code", type: "icd10", required: true },
      { key: "route", label: "Route(s) of administration", type: "select", required: true, options: ["Oral", "Sublingual", "Inhalation", "Topical", "Rectal", "Suppository"] },
      { key: "dailyDoseLimit", label: "Daily dose amount (mg)", type: "number", required: true },
      { key: "supplyDays", label: "Days supply (max 70)", type: "number", required: true },
      { key: "consentObtained", label: "Informed consent obtained", type: "checkbox", required: true },
      { key: "physicianName", label: "Qualified physician name", type: "text", required: true, source: "provider.fullName" },
      { key: "physicianMmur", label: "MMUR physician ID", type: "text", required: true },
      { key: "physicianSignature", label: "Physician signature", type: "signature", required: true },
      { key: "certificationDate", label: "Date of certification", type: "date", required: true, source: "encounter.serviceDate" },
    ],
  },
  {
    stateCode: "NY",
    stateName: "New York",
    formName: "Patient Certification",
    formId: "ny-cert-001",
    description: "Practitioner certification for medical cannabis under NY Compassionate Care Act",
    renewalPeriodDays: 365,
    requiredFields: [
      { key: "patientName", label: "Patient full name", type: "text", required: true, source: "patient.fullName" },
      { key: "patientDob", label: "Date of birth", type: "date", required: true, source: "patient.dateOfBirth" },
      { key: "registryId", label: "Patient registry ID", type: "text", required: false },
      { key: "qualifyingCondition", label: "Qualifying condition", type: "select", required: true, options: ["Cancer", "HIV/AIDS", "ALS", "Parkinson's disease", "Multiple sclerosis", "Epilepsy", "Inflammatory bowel disease", "Neuropathy", "Huntington's disease", "PTSD", "Chronic pain", "Substance use disorder", "Alzheimer's"] },
      { key: "diagnosisCode", label: "ICD-10 code", type: "icd10", required: true },
      { key: "formRecommendations", label: "Recommended form(s)", type: "text", required: false },
      { key: "practitionerName", label: "Practitioner name", type: "text", required: true, source: "provider.fullName" },
      { key: "practitionerNpi", label: "NPI number", type: "text", required: true },
      { key: "practitionerSignature", label: "Practitioner signature", type: "signature", required: true },
    ],
  },
  {
    stateCode: "CO",
    stateName: "Colorado",
    formName: "Physician Certification",
    formId: "co-cert-001",
    description: "Medical marijuana physician certification per Colorado Amendment 20",
    renewalPeriodDays: 365,
    requiredFields: [
      { key: "patientName", label: "Patient full name", type: "text", required: true, source: "patient.fullName" },
      { key: "patientDob", label: "Date of birth", type: "date", required: true, source: "patient.dateOfBirth" },
      { key: "qualifyingCondition", label: "Qualifying condition", type: "select", required: true, options: ["Cancer", "Glaucoma", "HIV/AIDS", "Cachexia", "Persistent muscle spasms", "Seizures", "Severe nausea", "Severe pain", "PTSD", "Autism spectrum disorder"] },
      { key: "diagnosisCode", label: "ICD-10 code", type: "icd10", required: true },
      { key: "bonafideRelationship", label: "Bona fide physician-patient relationship", type: "checkbox", required: true },
      { key: "physicianName", label: "Physician name", type: "text", required: true, source: "provider.fullName" },
      { key: "physicianLicense", label: "DEA/Medical license number", type: "text", required: true },
      { key: "physicianSignature", label: "Physician signature", type: "signature", required: true },
    ],
  },
  {
    stateCode: "IL",
    stateName: "Illinois",
    formName: "Written Certification",
    formId: "il-cert-001",
    description: "Physician written certification for the IL Compassionate Use of Medical Cannabis Program",
    renewalPeriodDays: 365,
    requiredFields: [
      { key: "patientName", label: "Patient full name", type: "text", required: true, source: "patient.fullName" },
      { key: "patientDob", label: "Date of birth", type: "date", required: true, source: "patient.dateOfBirth" },
      { key: "qualifyingCondition", label: "Qualifying condition", type: "select", required: true, options: ["Cancer", "Glaucoma", "HIV/AIDS", "Hepatitis C", "ALS", "Crohn's disease", "Agitation of Alzheimer's disease", "Cachexia/wasting syndrome", "Muscular dystrophy", "Severe fibromyalgia", "Spinal cord injury", "PTSD", "Chronic pain", "Migraines", "Osteoarthritis", "Irritable bowel syndrome", "Autism", "Chronic pain from DDD"] },
      { key: "diagnosisCode", label: "ICD-10 code", type: "icd10", required: true },
      { key: "physicianName", label: "Physician name", type: "text", required: true, source: "provider.fullName" },
      { key: "physicianLicense", label: "Medical license number", type: "text", required: true },
      { key: "physicianSignature", label: "Physician signature", type: "signature", required: true },
    ],
  },
  {
    stateCode: "PA",
    stateName: "Pennsylvania",
    formName: "Patient Certification",
    formId: "pa-cert-001",
    description: "Practitioner certification under PA Medical Marijuana Act (Act 16)",
    renewalPeriodDays: 365,
    requiredFields: [
      { key: "patientName", label: "Patient full name", type: "text", required: true, source: "patient.fullName" },
      { key: "patientDob", label: "Date of birth", type: "date", required: true, source: "patient.dateOfBirth" },
      { key: "qualifyingCondition", label: "Qualifying condition", type: "select", required: true, options: ["ALS", "Anxiety disorders", "Autism", "Cancer", "Crohn's disease", "Damage to nervous tissue", "Dyskinetic disorders", "Epilepsy", "Glaucoma", "HIV/AIDS", "Huntington's disease", "IBD", "Multiple sclerosis", "Neuropathies", "Opioid use disorder", "Parkinson's disease", "PTSD", "Sickle cell disease", "Terminal illness", "Tourette syndrome"] },
      { key: "diagnosisCode", label: "ICD-10 code", type: "icd10", required: true },
      { key: "practitionerName", label: "Practitioner name", type: "text", required: true, source: "provider.fullName" },
      { key: "practitionerRegistryId", label: "PA practitioner registry ID", type: "text", required: true },
      { key: "practitionerSignature", label: "Practitioner signature", type: "signature", required: true },
    ],
  },
  {
    stateCode: "OH",
    stateName: "Ohio",
    formName: "CTR Recommendation",
    formId: "oh-ctr-001",
    description: "Recommendation through Ohio's Cannabis Therapeutic Recommendation system",
    renewalPeriodDays: 365,
    requiredFields: [
      { key: "patientName", label: "Patient full name", type: "text", required: true, source: "patient.fullName" },
      { key: "patientDob", label: "Date of birth", type: "date", required: true, source: "patient.dateOfBirth" },
      { key: "qualifyingCondition", label: "Qualifying condition", type: "select", required: true, options: ["AIDS", "ALS", "Alzheimer's disease", "Cancer", "CBI", "Chronic pain", "Crohn's disease", "Epilepsy", "Fibromyalgia", "Glaucoma", "Hepatitis C", "IBD", "Multiple sclerosis", "Parkinson's disease", "PTSD", "Sickle cell anemia", "Spinal cord injury", "Terminal illness", "Tourette syndrome", "Traumatic brain injury", "UC"] },
      { key: "diagnosisCode", label: "ICD-10 code", type: "icd10", required: true },
      { key: "physicianName", label: "Physician name", type: "text", required: true, source: "provider.fullName" },
      { key: "ctrCertificateNumber", label: "CTR certificate number", type: "text", required: true },
      { key: "physicianSignature", label: "Physician signature", type: "signature", required: true },
    ],
  },
  {
    stateCode: "MI",
    stateName: "Michigan",
    formName: "Written Certification",
    formId: "mi-cert-001",
    description: "Physician certification under Michigan Medical Marihuana Act",
    renewalPeriodDays: 365,
    requiredFields: [
      { key: "patientName", label: "Patient full name", type: "text", required: true, source: "patient.fullName" },
      { key: "patientDob", label: "Date of birth", type: "date", required: true, source: "patient.dateOfBirth" },
      { key: "qualifyingCondition", label: "Qualifying condition", type: "select", required: true, options: ["Cancer", "Glaucoma", "HIV/AIDS", "Hepatitis C", "ALS", "Crohn's disease", "Agitation of Alzheimer's disease", "Nail-patella syndrome", "PTSD", "Obstetric-compulsive disorder", "Arthritis", "Chronic pain", "Colitis", "Spinal cord injury", "Cerebral palsy", "Autism"] },
      { key: "diagnosisCode", label: "ICD-10 code", type: "icd10", required: true },
      { key: "bonafideRelationship", label: "Bona fide physician-patient relationship exists", type: "checkbox", required: true },
      { key: "physicianName", label: "Physician name", type: "text", required: true, source: "provider.fullName" },
      { key: "physicianLicense", label: "Medical license number", type: "text", required: true },
      { key: "physicianSignature", label: "Physician signature", type: "signature", required: true },
    ],
  },
];

/**
 * Get the form template for a given state.
 */
export function getStateForm(stateCode: string): StateFormTemplate | undefined {
  return STATE_FORMS.find((f) => f.stateCode === stateCode);
}

/**
 * Get all available states.
 */
export function getAvailableStates(): { code: string; name: string }[] {
  return STATE_FORMS.map((f) => ({ code: f.stateCode, name: f.stateName }));
}

/**
 * Auto-populate form fields from patient/encounter data.
 */
export function autoPopulateForm(
  template: StateFormTemplate,
  patient: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    id: string;
  },
  provider?: {
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
  },
  encounter?: {
    scheduledFor?: Date | null;
  }
): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const field of template.requiredFields) {
    if (!field.source) continue;
    switch (field.source) {
      case "patient.fullName":
        fields[field.key] = `${patient.firstName} ${patient.lastName}`;
        break;
      case "patient.dateOfBirth":
        fields[field.key] = patient.dateOfBirth?.toISOString().slice(0, 10) ?? "";
        break;
      case "patient.address":
        fields[field.key] = [patient.addressLine1, patient.city, patient.state, patient.postalCode]
          .filter(Boolean).join(", ");
        break;
      case "patient.id":
        fields[field.key] = patient.id.slice(0, 12).toUpperCase();
        break;
      case "provider.fullName":
        if (provider) fields[field.key] = `${provider.title ?? "Dr."} ${provider.firstName ?? ""} ${provider.lastName ?? ""}`.trim();
        break;
      case "encounter.serviceDate":
        fields[field.key] = encounter?.scheduledFor?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10);
        break;
    }
  }

  // Auto-calculate expiration date
  if (template.requiredFields.find((f) => f.key === "expirationDate")) {
    const baseDate = encounter?.scheduledFor ?? new Date();
    const expDate = new Date(baseDate);
    expDate.setDate(expDate.getDate() + template.renewalPeriodDays);
    fields.expirationDate = expDate.toISOString().slice(0, 10);
  }

  return fields;
}
