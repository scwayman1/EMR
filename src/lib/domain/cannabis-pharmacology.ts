// Cannabis Clinical Pharmacology — EMR-146
// Pharmacokinetics, adverse effects, overdose management.
// Source: Health Canada reference + clinical literature.

// ── Pharmacokinetics by route ───────────────────────────

export interface RoutePharmacology {
  route: string;
  bioavailability: string;
  onset: string;
  peak: string;
  duration: string;
  halfLife: string;
  metabolism: string;
  notes: string;
}

export const ROUTE_PHARMACOLOGY: RoutePharmacology[] = [
  { route: "Inhalation (smoked/vaporized)", bioavailability: "10-35%", onset: "Seconds to minutes", peak: "3-10 minutes", duration: "2-4 hours", halfLife: "THC: 1.3h (acute)", metabolism: "Lungs → systemic. Bypasses first-pass hepatic metabolism. THC converts to 11-OH-THC (active) minimally.", notes: "Fastest onset. Dose titration easiest. Respiratory irritation risk with combustion." },
  { route: "Oral (capsules/edibles)", bioavailability: "4-20%", onset: "30-90 minutes", peak: "1-3 hours", duration: "5-8 hours", halfLife: "THC: 20-30h (chronic)", metabolism: "GI absorption → first-pass hepatic. CYP2C9/3A4 converts THC → 11-OH-THC (equipotent, crosses BBB readily).", notes: "Variable absorption. Fatty food increases bioavailability. 11-OH-THC may produce stronger psychoactive effects. NEVER re-dose before 2 hours." },
  { route: "Sublingual/Oromucosal", bioavailability: "15-35%", onset: "15-45 minutes", peak: "1-2 hours", duration: "4-6 hours", halfLife: "THC: ~24h (steady state)", metabolism: "Partial buccal absorption (bypasses first pass). Remainder swallowed → oral route kinetics.", notes: "Hold under tongue 60-90 seconds. More predictable than oral. Nabiximols (Sativex) uses this route." },
  { route: "Topical", bioavailability: "Local only (negligible systemic)", onset: "15-30 minutes", peak: "1-2 hours", duration: "2-4 hours", halfLife: "N/A (local)", metabolism: "Minimal systemic absorption through intact skin. Stays in local tissue.", notes: "No psychoactive effects. Safe for localized pain/inflammation. Can re-apply freely." },
  { route: "Transdermal (patch)", bioavailability: "~45%", onset: "1-2 hours", peak: "4-8 hours", duration: "8-12 hours", halfLife: "Depot release", metabolism: "Slow dermal absorption → systemic. Bypasses first-pass metabolism. Steady-state delivery.", notes: "Most consistent blood levels. Good for chronic conditions. May cause local skin irritation." },
  { route: "Rectal/Suppository", bioavailability: "13-50%", onset: "10-15 minutes", peak: "1-3 hours", duration: "4-8 hours", halfLife: "Variable", metabolism: "Partial bypass of hepatic first-pass via hemorrhoidal veins. Less psychoactive than oral despite higher absorption.", notes: "Useful for patients who cannot swallow or have severe nausea. Less studied route." },
];

// ── Adverse Effects ─────────────────────────────────────

export type AdverseEffectSeverity = "common" | "uncommon" | "serious" | "rare-serious";

export interface AdverseEffect {
  effect: string;
  severity: AdverseEffectSeverity;
  system: string;
  cannabinoid: string;
  frequency: string;
  management: string;
}

export const ADVERSE_EFFECTS: AdverseEffect[] = [
  // Common (>10%)
  { effect: "Drowsiness/sedation", severity: "common", system: "CNS", cannabinoid: "THC", frequency: ">30%", management: "Reduce dose. Take at bedtime. Avoid driving." },
  { effect: "Dizziness/lightheadedness", severity: "common", system: "CNS", cannabinoid: "THC", frequency: "15-25%", management: "Rise slowly from sitting/lying. Reduce dose. Ensure hydration." },
  { effect: "Dry mouth (xerostomia)", severity: "common", system: "GI", cannabinoid: "THC", frequency: "10-25%", management: "Increase water intake. Sugar-free gum. Oral moisturizer." },
  { effect: "Euphoria/feeling high", severity: "common", system: "CNS", cannabinoid: "THC", frequency: "10-20%", management: "Reduce THC dose. Increase CBD ratio. Switch route." },
  { effect: "Increased appetite", severity: "common", system: "Metabolic", cannabinoid: "THC", frequency: "10-20%", management: "Monitor weight. Prepare healthy snacks. May be therapeutic for cachexia." },
  { effect: "Impaired concentration", severity: "common", system: "CNS", cannabinoid: "THC", frequency: "10-15%", management: "Avoid complex tasks after dosing. Use during low-demand periods." },
  { effect: "Fatigue", severity: "common", system: "CNS", cannabinoid: "CBD", frequency: "10-15%", management: "Take at bedtime. Reduce dose if daytime use required." },
  { effect: "Diarrhea", severity: "common", system: "GI", cannabinoid: "CBD", frequency: "5-10%", management: "Usually resolves in 1-2 weeks. Take with food. Reduce dose." },

  // Uncommon (1-10%)
  { effect: "Orthostatic hypotension", severity: "uncommon", system: "Cardiovascular", cannabinoid: "THC", frequency: "3-7%", management: "Rise slowly. Hydrate. Monitor BP. Reduce dose if symptomatic." },
  { effect: "Tachycardia", severity: "uncommon", system: "Cardiovascular", cannabinoid: "THC", frequency: "3-5%", management: "Tolerance usually develops within days. CBD may mitigate. Monitor HR." },
  { effect: "Anxiety/paranoia", severity: "uncommon", system: "Psychiatric", cannabinoid: "THC", frequency: "2-8%", management: "Reduce THC immediately. Increase CBD. Switch to CBD-dominant. Reassure patient." },
  { effect: "Nausea", severity: "uncommon", system: "GI", cannabinoid: "THC", frequency: "2-5%", management: "Paradoxical. Take with food. Lower dose. Rule out CHS if chronic." },
  { effect: "Headache", severity: "uncommon", system: "CNS", cannabinoid: "THC/CBD", frequency: "2-5%", management: "Usually transient. Hydrate. OTC analgesic if needed." },
  { effect: "Dry eyes", severity: "uncommon", system: "Ophthalmic", cannabinoid: "THC", frequency: "2-5%", management: "Artificial tears. Not clinically significant." },
  { effect: "Elevated liver enzymes", severity: "uncommon", system: "Hepatic", cannabinoid: "CBD", frequency: "2-5%", management: "Monitor LFTs at baseline and follow-up. More common at high CBD doses (>10mg/kg/day). Check drug interactions (valproate)." },

  // Serious
  { effect: "Psychotic episode (acute)", severity: "serious", system: "Psychiatric", cannabinoid: "THC", frequency: "<1%", management: "STOP cannabis immediately. Assess safety. Psychiatric evaluation. Personal/family hx of psychosis is contraindication." },
  { effect: "Cannabinoid hyperemesis syndrome (CHS)", severity: "serious", system: "GI", cannabinoid: "THC", frequency: "<1%", management: "STOP all cannabis. Hot showers for acute relief. Capsaicin cream. Can recur on re-exposure." },
  { effect: "Severe anxiety/panic attack", severity: "serious", system: "Psychiatric", cannabinoid: "THC", frequency: "<1%", management: "Reassure. Safe environment. CBD may counteract. Benzodiazepine PRN if severe. Reduce/stop THC." },
  { effect: "Syncope (fainting)", severity: "serious", system: "Cardiovascular", cannabinoid: "THC", frequency: "<0.5%", management: "Supine position. Assess vitals. Rule out cardiac cause. Reduce dose significantly." },

  // Rare but serious
  { effect: "Myocardial infarction (increased risk)", severity: "rare-serious", system: "Cardiovascular", cannabinoid: "THC", frequency: "Rare", management: "Absolute contraindication in unstable CV disease. Relative contraindication in stable CAD. Risk highest in first hour after inhalation." },
  { effect: "Cannabis use disorder", severity: "rare-serious", system: "Psychiatric", cannabinoid: "THC", frequency: "~9% lifetime", management: "Monitor for tolerance, escalating use, inability to cut down. Screen with CUDIT-R. Gradual taper if needed." },
];

// ── Overdose Management ─────────────────────────────────

export interface OverdoseProtocol {
  severity: "mild" | "moderate" | "severe";
  symptoms: string[];
  management: string[];
  timeToResolution: string;
}

export const OVERDOSE_PROTOCOLS: OverdoseProtocol[] = [
  {
    severity: "mild",
    symptoms: ["Excessive sedation", "Dry mouth", "Mild anxiety", "Tachycardia (HR 100-120)", "Impaired coordination"],
    management: ["Reassure — symptoms will pass", "Quiet, comfortable environment", "Hydrate — water, not alcohol or caffeine", "Light snack if tolerated", "Do NOT drive or operate machinery", "Monitor for 2-4 hours"],
    timeToResolution: "2-4 hours (inhaled), 4-8 hours (oral)",
  },
  {
    severity: "moderate",
    symptoms: ["Significant anxiety or paranoia", "Tachycardia (HR >120)", "Orthostatic hypotension", "Nausea/vomiting", "Confusion or disorientation", "Panic-like symptoms"],
    management: ["All mild measures plus:", "Calm, supervised environment — do not leave alone", "CBD 25-50mg sublingual may counteract THC (if available)", "Monitor vitals: HR, BP, SpO2", "Consider ED referral if symptoms escalate", "Benzodiazepine (lorazepam 1-2mg) if severe anxiety and physician-directed"],
    timeToResolution: "4-8 hours (inhaled), 8-12 hours (oral)",
  },
  {
    severity: "severe",
    symptoms: ["Psychotic symptoms (hallucinations, delusions)", "Seizure (rare, more common in children)", "Severe bradycardia or tachyarrhythmia", "Unresponsiveness", "Respiratory depression (very rare, usually with co-ingestants)"],
    management: ["Call 911 / Emergency Department immediately", "ABC assessment (airway, breathing, circulation)", "IV access, cardiac monitoring", "Benzodiazepine for seizure/agitation", "Activated charcoal if oral ingestion <1 hour (if alert)", "Supportive care — no specific antidote exists", "Psychiatric evaluation if psychotic features"],
    timeToResolution: "12-24 hours. May require observation.",
  },
];

// ── CYP450 Drug Interactions ────────────────────────────

export interface CYPInteraction {
  drug: string;
  drugClass: string;
  cannabinoid: string;
  enzyme: string;
  effect: string;
  clinicalSignificance: "major" | "moderate" | "minor";
  recommendation: string;
}

export const CYP_INTERACTIONS: CYPInteraction[] = [
  { drug: "Warfarin", drugClass: "Anticoagulant", cannabinoid: "CBD", enzyme: "CYP2C9", effect: "CBD inhibits CYP2C9 → increased warfarin levels → bleeding risk", clinicalSignificance: "major", recommendation: "Monitor INR closely. May need 30-50% warfarin dose reduction. Weekly INR during initiation." },
  { drug: "Clobazam", drugClass: "Benzodiazepine", cannabinoid: "CBD", enzyme: "CYP2C19", effect: "CBD inhibits CYP2C19 → increased clobazam (and N-desmethylclobazam) levels → sedation", clinicalSignificance: "major", recommendation: "Reduce clobazam dose. Monitor sedation. Established in Epidiolex trials." },
  { drug: "Valproate", drugClass: "Anticonvulsant", cannabinoid: "CBD", enzyme: "Hepatic", effect: "Combined hepatotoxicity risk. CBD + valproate → elevated transaminases", clinicalSignificance: "major", recommendation: "Monitor LFTs at baseline, 1mo, 3mo, 6mo. Consider dose adjustment if ALT > 3x ULN." },
  { drug: "Tacrolimus", drugClass: "Immunosuppressant", cannabinoid: "CBD/THC", enzyme: "CYP3A4", effect: "Cannabinoids inhibit CYP3A4 → increased tacrolimus levels → toxicity risk", clinicalSignificance: "major", recommendation: "Monitor tacrolimus trough levels. May need dose reduction. Transplant team coordination required." },
  { drug: "Fentanyl", drugClass: "Opioid", cannabinoid: "CBD", enzyme: "CYP3A4", effect: "CBD inhibits CYP3A4 → slowed fentanyl metabolism → respiratory depression risk", clinicalSignificance: "major", recommendation: "Use with extreme caution. Monitor respiratory rate. Consider opioid dose reduction." },
  { drug: "SSRIs (general)", drugClass: "Antidepressant", cannabinoid: "CBD", enzyme: "CYP2D6/3A4", effect: "CBD may increase SSRI levels via CYP inhibition → serotonin syndrome risk (theoretical)", clinicalSignificance: "moderate", recommendation: "Monitor for serotonin symptoms. Start CBD low. Most patients tolerate combination." },
  { drug: "Metformin", drugClass: "Antidiabetic", cannabinoid: "THC/CBD", enzyme: "Minimal", effect: "Pharmacodynamic: THC may increase appetite, countering metformin's effect", clinicalSignificance: "minor", recommendation: "Monitor blood glucose. No significant PK interaction." },
  { drug: "Statins (atorvastatin)", drugClass: "Lipid-lowering", cannabinoid: "CBD", enzyme: "CYP3A4", effect: "CBD inhibits CYP3A4 → increased statin levels → myopathy risk", clinicalSignificance: "moderate", recommendation: "Monitor for muscle symptoms. Consider lower statin dose or switch to rosuvastatin (CYP2C9)." },
  { drug: "Omeprazole", drugClass: "PPI", cannabinoid: "CBD", enzyme: "CYP2C19", effect: "CBD inhibits CYP2C19 → increased omeprazole levels", clinicalSignificance: "minor", recommendation: "Generally well tolerated. No dose adjustment usually needed." },
  { drug: "Rifampin", drugClass: "Antibiotic", cannabinoid: "CBD/THC", enzyme: "CYP3A4 inducer", effect: "Rifampin INDUCES CYP3A4 → decreased cannabinoid levels → reduced efficacy", clinicalSignificance: "moderate", recommendation: "May need to increase cannabis dose during rifampin treatment. Monitor therapeutic effect." },
];

// Lookup helpers
export function getAdverseEffectsBySystem(system: string): AdverseEffect[] {
  return ADVERSE_EFFECTS.filter((ae) => ae.system.toLowerCase() === system.toLowerCase());
}

export function getAdverseEffectsBySeverity(severity: AdverseEffectSeverity): AdverseEffect[] {
  return ADVERSE_EFFECTS.filter((ae) => ae.severity === severity);
}

export function getCYPInteractionsByDrug(drug: string): CYPInteraction[] {
  const q = drug.toLowerCase();
  return CYP_INTERACTIONS.filter((i) => i.drug.toLowerCase().includes(q) || i.drugClass.toLowerCase().includes(q));
}

export function getMajorInteractions(): CYPInteraction[] {
  return CYP_INTERACTIONS.filter((i) => i.clinicalSignificance === "major");
}
