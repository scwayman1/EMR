// Onboarding Wizard — guided setup for new practices
// Steps a new practice through configuration to go-live.

export type OnboardingStepStatus = "not_started" | "in_progress" | "complete" | "skipped";

export interface OnboardingStep {
  id: string;
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  required: boolean;
  status: OnboardingStepStatus;
  href: string;
  category: "basics" | "clinical" | "billing" | "ai" | "launch";
  checks: { label: string; met: boolean }[];
}

export const ONBOARDING_STEPS: Omit<OnboardingStep, "status" | "checks">[] = [
  // Basics
  { id: "org-profile", order: 1, title: "Practice profile", description: "Set your practice name, address, phone, and business hours.", estimatedMinutes: 5, required: true, href: "/ops/launch", category: "basics" },
  { id: "providers", order: 2, title: "Add providers", description: "Register physicians and their NPI numbers, specialties, and availability.", estimatedMinutes: 10, required: true, href: "/clinic/providers", category: "basics" },
  { id: "state-config", order: 3, title: "Select your state", description: "Configure state-specific compliance forms and qualifying conditions.", estimatedMinutes: 3, required: true, href: "/ops/settings/ai-config", category: "basics" },

  // Clinical
  { id: "formulary", order: 4, title: "Build your formulary", description: "Add cannabis products your practice recommends — with cannabinoid profiles and dosing guidance.", estimatedMinutes: 15, required: true, href: "/ops/patients", category: "clinical" },
  { id: "intake-form", order: 5, title: "Customize intake form", description: "Review and customize the patient intake form for your practice.", estimatedMinutes: 10, required: false, href: "/ops/intake-builder", category: "clinical" },
  { id: "note-templates", order: 6, title: "Review note templates", description: "Check the clinical note templates match your documentation style.", estimatedMinutes: 5, required: false, href: "/clinic/library", category: "clinical" },
  { id: "consent-forms", order: 7, title: "Configure consent forms", description: "Review and customize the consent forms patients will sign.", estimatedMinutes: 5, required: true, href: "/portal/consent", category: "clinical" },

  // Billing
  { id: "fee-schedule", order: 8, title: "Set fee schedule", description: "Define your CPT code fees for office visits, telehealth, and procedures.", estimatedMinutes: 10, required: true, href: "/ops/billing", category: "billing" },
  { id: "payment-gateway", order: 9, title: "Connect payment processing", description: "Set up Payabli or another payment gateway for patient payments.", estimatedMinutes: 10, required: false, href: "/ops/billing", category: "billing" },
  { id: "insurance", order: 10, title: "Configure payer information", description: "Add insurance payers and their EDI IDs for claims submission.", estimatedMinutes: 15, required: false, href: "/ops/billing", category: "billing" },

  // AI
  { id: "ai-model", order: 11, title: "Configure AI model", description: "Choose your AI provider and model. OpenRouter recommended for cost efficiency.", estimatedMinutes: 3, required: true, href: "/ops/settings/ai-config", category: "ai" },
  { id: "test-agents", order: 12, title: "Test AI agents", description: "Run a test encounter to verify the scribe, triage, and coding agents work.", estimatedMinutes: 5, required: false, href: "/ops/mission-control", category: "ai" },

  // Launch
  { id: "demo-patient", order: 13, title: "Create a test patient", description: "Walk through the full patient journey: intake → visit → note → leaflet.", estimatedMinutes: 10, required: true, href: "/ops/patients", category: "launch" },
  { id: "go-live", order: 14, title: "Go live", description: "Everything looks good. Flip the switch and start seeing real patients.", estimatedMinutes: 1, required: true, href: "/ops/launch", category: "launch" },
];

export function calculateProgress(steps: OnboardingStep[]): {
  totalSteps: number;
  completedSteps: number;
  requiredRemaining: number;
  percentComplete: number;
  estimatedMinutesRemaining: number;
  nextStep: OnboardingStep | null;
} {
  const completed = steps.filter((s) => s.status === "complete" || s.status === "skipped").length;
  const requiredRemaining = steps.filter((s) => s.required && s.status !== "complete").length;
  const remaining = steps.filter((s) => s.status === "not_started" || s.status === "in_progress");
  const minutesRemaining = remaining.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const nextStep = remaining.sort((a, b) => a.order - b.order)[0] ?? null;

  return {
    totalSteps: steps.length,
    completedSteps: completed,
    requiredRemaining,
    percentComplete: Math.round((completed / steps.length) * 100),
    estimatedMinutesRemaining: minutesRemaining,
    nextStep,
  };
}

export const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  basics: { label: "Practice basics", icon: "B" },
  clinical: { label: "Clinical setup", icon: "C" },
  billing: { label: "Billing & payments", icon: "$" },
  ai: { label: "AI configuration", icon: "AI" },
  launch: { label: "Go live", icon: "Go" },
};
