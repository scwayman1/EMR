// Lab Value Explainer — EMR-32 / EMR-155
// 3rd-grade reading level explanations for common lab values.
// Hover over any lab value → explains what it means, why it's high or low.

export interface LabExplanation {
  name: string;
  abbreviation: string;
  unit: string;
  normalRange: { low: number; high: number };
  simpleExplanation: string;
  whenHigh: string;
  whenLow: string;
  whenNormal: string;
  emoji: string;
}

export type LabStatus = "low" | "normal" | "high" | "unknown";

export interface LabResult {
  explanation: LabExplanation;
  status: LabStatus;
  message: string;
}

const LABS: LabExplanation[] = [
  { name: "Blood Pressure (top number)", abbreviation: "SBP", unit: "mmHg", normalRange: { low: 90, high: 120 }, emoji: "\u2764\uFE0F", simpleExplanation: "How hard your blood pushes against your blood vessel walls when your heart beats.", whenHigh: "Your heart is working harder than it should. This can be improved with lifestyle changes and medicine.", whenLow: "Your blood pressure is on the low side. You might feel dizzy when you stand up.", whenNormal: "Your blood pressure is in a healthy range. Great job!" },
  { name: "Blood Pressure (bottom number)", abbreviation: "DBP", unit: "mmHg", normalRange: { low: 60, high: 80 }, emoji: "\u2764\uFE0F", simpleExplanation: "How hard your blood pushes when your heart rests between beats.", whenHigh: "Your blood vessels are staying tight even when your heart rests.", whenLow: "This is usually fine unless you feel dizzy.", whenNormal: "Your resting blood pressure looks good!" },
  { name: "Heart Rate", abbreviation: "HR", unit: "bpm", normalRange: { low: 60, high: 100 }, emoji: "\uD83D\uDC93", simpleExplanation: "How many times your heart beats in one minute.", whenHigh: "Your heart is beating faster than usual. This can happen with stress, caffeine, or illness.", whenLow: "A low heart rate can be normal for active people. If you feel faint, tell your care team.", whenNormal: "Your heart rate is steady and healthy." },
  { name: "A1C", abbreviation: "HbA1c", unit: "%", normalRange: { low: 4.0, high: 5.6 }, emoji: "\uD83C\uDF6F", simpleExplanation: "A snapshot of your average blood sugar over the last 3 months.", whenHigh: "Your blood sugar has been running high. Your care team can help with a plan.", whenLow: "Your blood sugar has been very low. This is rare but worth checking.", whenNormal: "Your blood sugar has been steady. Keep up the good work!" },
  { name: "Fasting Glucose", abbreviation: "FBG", unit: "mg/dL", normalRange: { low: 70, high: 99 }, emoji: "\uD83C\uDF6C", simpleExplanation: "How much sugar is in your blood after not eating overnight.", whenHigh: "There is more sugar in your blood than usual. This is worth watching.", whenLow: "Your blood sugar is low. You might feel shaky or tired.", whenNormal: "Your fasting sugar is right where it should be." },
  { name: "Total Cholesterol", abbreviation: "TC", unit: "mg/dL", normalRange: { low: 125, high: 200 }, emoji: "\uD83E\uDDC8", simpleExplanation: "The total amount of fat-like stuff in your blood.", whenHigh: "There is extra cholesterol in your blood. Diet and medicine can help.", whenLow: "Low cholesterol is usually fine.", whenNormal: "Your cholesterol is in a healthy range." },
  { name: "LDL Cholesterol", abbreviation: "LDL", unit: "mg/dL", normalRange: { low: 0, high: 100 }, emoji: "\u26A0\uFE0F", simpleExplanation: "The \"bad\" cholesterol that can clog your blood vessels.", whenHigh: "Too much LDL can build up in your blood vessels. Your care team can help lower it.", whenLow: "Low LDL is great for your heart.", whenNormal: "Your LDL is in a safe range. Nice!" },
  { name: "HDL Cholesterol", abbreviation: "HDL", unit: "mg/dL", normalRange: { low: 40, high: 999 }, emoji: "\uD83C\uDF1F", simpleExplanation: "The \"good\" cholesterol that cleans your blood vessels.", whenHigh: "High HDL is actually good. It protects your heart.", whenLow: "Your good cholesterol is low. Exercise and healthy fats can help raise it.", whenNormal: "Your good cholesterol is helping protect your heart." },
  { name: "Triglycerides", abbreviation: "TG", unit: "mg/dL", normalRange: { low: 0, high: 150 }, emoji: "\uD83E\uDED2", simpleExplanation: "A type of fat in your blood from the food you eat.", whenHigh: "High triglycerides can come from sugary foods, alcohol, or extra weight.", whenLow: "Low triglycerides are totally fine.", whenNormal: "Your triglycerides are in a good range." },
  { name: "Vitamin D", abbreviation: "Vit D", unit: "ng/mL", normalRange: { low: 30, high: 100 }, emoji: "\u2600\uFE0F", simpleExplanation: "The sunshine vitamin. Your bones and immune system need it.", whenHigh: "Very rare. Your care team will adjust your supplement.", whenLow: "You need more vitamin D. A supplement or more sunshine can help.", whenNormal: "Your vitamin D is right where it should be." },
  { name: "Vitamin B12", abbreviation: "B12", unit: "pg/mL", normalRange: { low: 200, high: 900 }, emoji: "\u26A1", simpleExplanation: "A vitamin your nerves and blood cells need to stay healthy.", whenHigh: "High B12 is usually harmless.", whenLow: "Low B12 can make you tired and foggy. A supplement can help.", whenNormal: "Your B12 levels look good." },
  { name: "Iron (Ferritin)", abbreviation: "Ferritin", unit: "ng/mL", normalRange: { low: 20, high: 200 }, emoji: "\uD83E\uDDE2", simpleExplanation: "How much iron your body has stored. Iron helps carry oxygen in your blood.", whenHigh: "Your body is storing more iron than it needs.", whenLow: "Your iron is low. You might feel tired or cold. Iron-rich foods or supplements can help.", whenNormal: "Your iron stores are healthy." },
  { name: "Kidney Function", abbreviation: "eGFR", unit: "mL/min", normalRange: { low: 60, high: 999 }, emoji: "\uD83E\uDEC0", simpleExplanation: "How well your kidneys are cleaning your blood.", whenHigh: "High eGFR means your kidneys are filtering well.", whenLow: "Your kidneys are not filtering as well as they could. Your care team will watch this.", whenNormal: "Your kidneys are working well." },
  { name: "Creatinine", abbreviation: "Cr", unit: "mg/dL", normalRange: { low: 0.6, high: 1.2 }, emoji: "\uD83E\uDEC0", simpleExplanation: "A waste product your muscles make. Your kidneys remove it.", whenHigh: "Your kidneys may not be clearing waste as quickly. Worth checking.", whenLow: "Low creatinine is usually fine.", whenNormal: "Your kidneys are removing waste well." },
  { name: "Liver Enzyme (ALT)", abbreviation: "ALT", unit: "U/L", normalRange: { low: 7, high: 56 }, emoji: "\uD83E\uDEC1", simpleExplanation: "A marker that shows how your liver is doing.", whenHigh: "Your liver might be working extra hard. This can come from medicine, alcohol, or other causes.", whenLow: "Low ALT is normal.", whenNormal: "Your liver looks healthy." },
  { name: "Liver Enzyme (AST)", abbreviation: "AST", unit: "U/L", normalRange: { low: 10, high: 40 }, emoji: "\uD83E\uDEC1", simpleExplanation: "Another marker for liver health.", whenHigh: "Your liver may be under some stress. Your care team will investigate.", whenLow: "Low AST is normal.", whenNormal: "Your liver enzyme levels are good." },
  { name: "Thyroid (TSH)", abbreviation: "TSH", unit: "mIU/L", normalRange: { low: 0.4, high: 4.0 }, emoji: "\uD83E\uDD8B", simpleExplanation: "A signal from your brain telling your thyroid gland how hard to work.", whenHigh: "Your thyroid might be running slow. You could feel tired or cold.", whenLow: "Your thyroid might be running too fast. You could feel jittery or warm.", whenNormal: "Your thyroid is balanced." },
  { name: "White Blood Cells", abbreviation: "WBC", unit: "K/uL", normalRange: { low: 4.5, high: 11.0 }, emoji: "\uD83D\uDEE1\uFE0F", simpleExplanation: "Your body's soldiers that fight infections.", whenHigh: "Your body might be fighting an infection or dealing with inflammation.", whenLow: "Your immune army is a little small. Your care team will keep an eye on this.", whenNormal: "Your immune system looks strong." },
  { name: "Red Blood Cells", abbreviation: "RBC", unit: "M/uL", normalRange: { low: 4.0, high: 5.5 }, emoji: "\uD83D\uDD34", simpleExplanation: "The cells that carry oxygen to every part of your body.", whenHigh: "You have extra red blood cells. This can happen at high altitudes or from other causes.", whenLow: "You might not have enough oxygen carriers. This is called anemia.", whenNormal: "Your red blood cells are in a healthy range." },
  { name: "Hemoglobin", abbreviation: "Hgb", unit: "g/dL", normalRange: { low: 12.0, high: 17.5 }, emoji: "\uD83E\uDE78", simpleExplanation: "The protein inside red blood cells that actually holds the oxygen.", whenHigh: "High hemoglobin is sometimes normal but worth checking.", whenLow: "Low hemoglobin means less oxygen getting around your body. You might feel tired.", whenNormal: "Your hemoglobin is healthy." },
  { name: "Platelets", abbreviation: "PLT", unit: "K/uL", normalRange: { low: 150, high: 400 }, emoji: "\uD83E\uDE79", simpleExplanation: "Tiny cell pieces that help your blood clot when you get a cut.", whenHigh: "Your blood might clot too easily. Your care team will check.", whenLow: "You might bruise or bleed more easily.", whenNormal: "Your platelets are right where they should be." },
  { name: "Sodium", abbreviation: "Na", unit: "mEq/L", normalRange: { low: 136, high: 145 }, emoji: "\uD83E\uDDC2", simpleExplanation: "A mineral that helps your body balance fluids and your nerves work.", whenHigh: "You might be a little dehydrated. Drink more water.", whenLow: "Low sodium can make you feel confused or tired. Your care team will help.", whenNormal: "Your sodium is balanced." },
  { name: "Potassium", abbreviation: "K", unit: "mEq/L", normalRange: { low: 3.5, high: 5.0 }, emoji: "\uD83C\uDF4C", simpleExplanation: "A mineral your heart and muscles need to work properly.", whenHigh: "Too much potassium can affect your heart rhythm.", whenLow: "Low potassium can cause cramps or weakness.", whenNormal: "Your potassium is in a healthy range." },
  { name: "Calcium", abbreviation: "Ca", unit: "mg/dL", normalRange: { low: 8.5, high: 10.5 }, emoji: "\uD83E\uDDB4", simpleExplanation: "A mineral for strong bones, teeth, and muscle movement.", whenHigh: "Too much calcium can come from overactive glands or too many supplements.", whenLow: "Low calcium can cause tingling or cramps. Your care team can help.", whenNormal: "Your calcium is keeping your bones strong." },
];

const byAbbr = new Map<string, LabExplanation>();
const byNameLower = new Map<string, LabExplanation>();
for (const lab of LABS) {
  byAbbr.set(lab.abbreviation.toLowerCase(), lab);
  byNameLower.set(lab.name.toLowerCase(), lab);
}

/** Look up a lab by name or abbreviation */
export function findLab(nameOrAbbr: string): LabExplanation | null {
  const q = nameOrAbbr.trim().toLowerCase();
  return byAbbr.get(q) ?? byNameLower.get(q) ?? LABS.find((l) =>
    l.name.toLowerCase().includes(q) || l.abbreviation.toLowerCase().includes(q)
  ) ?? null;
}

/** Explain a lab value — returns the explanation + whether it's low/normal/high */
export function explainLabValue(nameOrAbbr: string, value?: number): LabResult | null {
  const explanation = findLab(nameOrAbbr);
  if (!explanation) return null;

  if (value === undefined || value === null) {
    return { explanation, status: "unknown", message: explanation.simpleExplanation };
  }

  let status: LabStatus;
  let message: string;
  if (value < explanation.normalRange.low) {
    status = "low";
    message = explanation.whenLow;
  } else if (value > explanation.normalRange.high) {
    status = "high";
    message = explanation.whenHigh;
  } else {
    status = "normal";
    message = explanation.whenNormal;
  }

  return { explanation, status, message };
}

/** Get all lab explanations */
export function getAllLabs(): LabExplanation[] {
  return [...LABS];
}
