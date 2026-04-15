// Custom Intake Form Builder — drag-and-drop form customization
// Let practices add/reorder/customize intake form fields.

export type IntakeFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "email"
  | "phone"
  | "select"
  | "multi_select"
  | "checkbox"
  | "radio"
  | "scale"
  | "heading"
  | "paragraph";

export interface IntakeField {
  id: string;
  type: IntakeFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
  helpText?: string;
  section: string;
  order: number;
  conditional?: { fieldId: string; value: string }; // Show only when another field has this value
  mapTo?: string; // Maps to patient model field (e.g., "firstName", "dateOfBirth")
}

export interface IntakeFormTemplate {
  id: string;
  name: string;
  description: string;
  sections: { id: string; title: string; description?: string }[];
  fields: IntakeField[];
  version: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Field type metadata ────────────────────────────────

export const FIELD_TYPES: Record<IntakeFieldType, { label: string; icon: string; hasOptions: boolean }> = {
  text: { label: "Short text", icon: "Aa", hasOptions: false },
  textarea: { label: "Long text", icon: "T", hasOptions: false },
  number: { label: "Number", icon: "#", hasOptions: false },
  date: { label: "Date", icon: "Cal", hasOptions: false },
  email: { label: "Email", icon: "@", hasOptions: false },
  phone: { label: "Phone", icon: "Ph", hasOptions: false },
  select: { label: "Dropdown", icon: "v", hasOptions: true },
  multi_select: { label: "Multi-select", icon: "[]", hasOptions: true },
  checkbox: { label: "Checkbox", icon: "Chk", hasOptions: false },
  radio: { label: "Radio group", icon: "O", hasOptions: true },
  scale: { label: "Scale (1-10)", icon: "1-10", hasOptions: false },
  heading: { label: "Section heading", icon: "H", hasOptions: false },
  paragraph: { label: "Info text", icon: "P", hasOptions: false },
};

// ── Default intake template ────────────────────────────

export const DEFAULT_INTAKE_TEMPLATE: IntakeFormTemplate = {
  id: "default-intake",
  name: "Standard Cannabis Patient Intake",
  description: "Default intake form for new cannabis care patients",
  version: 1,
  isDefault: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  sections: [
    { id: "demographics", title: "Demographics", description: "Basic personal information" },
    { id: "medical", title: "Medical History", description: "Current conditions and medications" },
    { id: "cannabis", title: "Cannabis History", description: "Prior cannabis use and preferences" },
    { id: "goals", title: "Treatment Goals", description: "What you hope to achieve" },
    { id: "consent", title: "Consents", description: "Required acknowledgments" },
  ],
  fields: [
    { id: "f1", type: "text", label: "First name", required: true, section: "demographics", order: 1, mapTo: "firstName" },
    { id: "f2", type: "text", label: "Last name", required: true, section: "demographics", order: 2, mapTo: "lastName" },
    { id: "f3", type: "date", label: "Date of birth", required: true, section: "demographics", order: 3, mapTo: "dateOfBirth" },
    { id: "f4", type: "email", label: "Email address", required: true, section: "demographics", order: 4, mapTo: "email" },
    { id: "f5", type: "phone", label: "Phone number", required: false, section: "demographics", order: 5, mapTo: "phone" },
    { id: "f6", type: "select", label: "Sex", required: true, section: "demographics", order: 6, options: ["Male", "Female", "Non-binary", "Prefer not to say"] },
    { id: "f7", type: "text", label: "Street address", required: false, section: "demographics", order: 7, mapTo: "addressLine1" },
    { id: "f8", type: "text", label: "City", required: false, section: "demographics", order: 8, mapTo: "city" },
    { id: "f9", type: "select", label: "State", required: false, section: "demographics", order: 9, mapTo: "state", options: ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"] },

    { id: "f10", type: "textarea", label: "Current medical conditions", required: true, section: "medical", order: 1, helpText: "List all current diagnoses" },
    { id: "f11", type: "textarea", label: "Current medications", required: true, section: "medical", order: 2, helpText: "Include dosages" },
    { id: "f12", type: "textarea", label: "Allergies", required: false, section: "medical", order: 3, helpText: "Drug and food allergies" },
    { id: "f13", type: "textarea", label: "Surgical history", required: false, section: "medical", order: 4 },
    { id: "f14", type: "select", label: "Do you currently use tobacco?", required: false, section: "medical", order: 5, options: ["No", "Yes - daily", "Yes - occasionally", "Former user"] },
    { id: "f15", type: "select", label: "Alcohol use", required: false, section: "medical", order: 6, options: ["None", "Social (1-2/week)", "Moderate (3-5/week)", "Daily"] },

    { id: "f16", type: "radio", label: "Have you used cannabis before?", required: true, section: "cannabis", order: 1, options: ["Never", "Tried once or twice", "Used occasionally", "Regular user", "Daily user"] },
    { id: "f17", type: "multi_select", label: "What forms have you tried?", required: false, section: "cannabis", order: 2, options: ["Flower/smoking", "Edibles", "Tinctures", "Topicals", "Vaporizer", "Capsules", "None"] },
    { id: "f18", type: "textarea", label: "What benefits have you experienced?", required: false, section: "cannabis", order: 3 },
    { id: "f19", type: "textarea", label: "Any negative experiences?", required: false, section: "cannabis", order: 4 },

    { id: "f20", type: "textarea", label: "Primary concerns", required: true, section: "goals", order: 1, helpText: "What symptoms or conditions bring you here?", mapTo: "presentingConcerns" },
    { id: "f21", type: "textarea", label: "Treatment goals", required: true, section: "goals", order: 2, helpText: "What do you hope to achieve?", mapTo: "treatmentGoals" },
    { id: "f22", type: "scale", label: "Current pain level", required: false, section: "goals", order: 3, scaleMin: 0, scaleMax: 10, scaleLabels: { min: "No pain", max: "Worst pain" } },
    { id: "f23", type: "scale", label: "Current sleep quality", required: false, section: "goals", order: 4, scaleMin: 0, scaleMax: 10, scaleLabels: { min: "Very poor", max: "Excellent" } },

    { id: "f24", type: "checkbox", label: "I consent to the use of medical cannabis as part of my treatment plan", required: true, section: "consent", order: 1 },
    { id: "f25", type: "checkbox", label: "I understand that cannabis remains a Schedule I substance under federal law", required: true, section: "consent", order: 2 },
    { id: "f26", type: "checkbox", label: "I agree to follow dosing instructions provided by my care team", required: true, section: "consent", order: 3 },
  ],
};
