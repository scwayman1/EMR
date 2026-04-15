// Patient Q&A Knowledge Base
// Searchable FAQ/knowledge base for patients.

export interface QAEntry {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
  relatedIds?: string[];
}

export const CATEGORIES = [
  "Getting Started",
  "Cannabis Basics",
  "Dosing & Safety",
  "Side Effects",
  "Legal & Compliance",
  "Your Account",
  "Billing & Insurance",
  "Appointments",
  "Prescriptions",
] as const;

export const QA_DATABASE: QAEntry[] = [
  // Getting Started
  { id: "qa-1", category: "Getting Started", question: "How do I get started with medical cannabis?", answer: "Start by scheduling a consultation with one of our providers. During your visit, we'll review your medical history, discuss your symptoms and treatment goals, and determine if medical cannabis is appropriate for you. If so, we'll create a personalized treatment plan.", tags: ["new patient", "getting started", "first visit"], relatedIds: ["qa-2", "qa-3"] },
  { id: "qa-2", category: "Getting Started", question: "What should I bring to my first appointment?", answer: "Please bring: (1) a valid photo ID, (2) your current medication list, (3) any relevant medical records or lab results, (4) your insurance card if applicable, and (5) a list of questions or concerns. Our online intake form will collect most of the medical history beforehand.", tags: ["first visit", "intake", "documents"], relatedIds: ["qa-1"] },
  { id: "qa-3", category: "Getting Started", question: "Do I need a qualifying condition?", answer: "Requirements vary by state. Most states require a qualifying medical condition such as chronic pain, anxiety, PTSD, cancer, epilepsy, or multiple sclerosis. During your consultation, your provider will evaluate whether you meet your state's criteria.", tags: ["qualifying", "condition", "eligibility"], relatedIds: ["qa-1"] },

  // Cannabis Basics
  { id: "qa-4", category: "Cannabis Basics", question: "What is the difference between THC and CBD?", answer: "THC (tetrahydrocannabinol) is the primary psychoactive compound that produces the 'high' feeling. It's effective for pain, nausea, and appetite stimulation. CBD (cannabidiol) is non-psychoactive and is used for anxiety, inflammation, and seizures. Many patients benefit from products with both THC and CBD in specific ratios.", tags: ["THC", "CBD", "cannabinoids", "basics"] },
  { id: "qa-5", category: "Cannabis Basics", question: "What are terpenes and why do they matter?", answer: "Terpenes are aromatic compounds found in cannabis that contribute to each strain's unique smell and taste. Research suggests they also have therapeutic effects and may enhance the benefits of cannabinoids (the 'entourage effect'). For example, myrcene promotes relaxation, limonene may improve mood, and linalool has calming properties.", tags: ["terpenes", "entourage effect", "strains"] },
  { id: "qa-6", category: "Cannabis Basics", question: "What delivery methods are available?", answer: "Common delivery methods include: (1) Oral (edibles, capsules) — slower onset (30-90 min) but longer duration (4-8 hrs). (2) Sublingual (tinctures) — moderate onset (15-45 min), good dose control. (3) Inhalation (vaporizer) — fastest onset (minutes) but shorter duration (2-4 hrs). (4) Topical (creams, balms) — local relief, no psychoactive effects. Your provider will recommend the best method for your condition.", tags: ["delivery", "route", "edibles", "tincture", "vaporizer", "topical"] },

  // Dosing & Safety
  { id: "qa-7", category: "Dosing & Safety", question: "What is 'start low and go slow'?", answer: "This is the golden rule of cannabis dosing. Start with the lowest effective dose and increase gradually over days or weeks. For THC, this typically means starting at 1-2.5 mg and waiting at least 2 hours before considering another dose (especially with edibles). This approach minimizes side effects while finding your optimal dose.", tags: ["dosing", "start low", "titration", "safety"] },
  { id: "qa-8", category: "Dosing & Safety", question: "Can I take cannabis with my other medications?", answer: "Cannabis can interact with certain medications, especially blood thinners (warfarin), anti-seizure drugs, and sedatives. Our system automatically checks for interactions when your provider creates your treatment plan. Always inform your provider about ALL medications you're taking, including supplements.", tags: ["interactions", "medications", "safety", "drug interactions"] },
  { id: "qa-9", category: "Dosing & Safety", question: "What if I take too much?", answer: "If you experience anxiety, paranoia, rapid heartbeat, or nausea from too much THC: (1) Stay calm — it will pass, usually within 2-4 hours. (2) Move to a quiet, comfortable space. (3) Hydrate with water. (4) Try CBD if available — it can counteract THC effects. (5) Call our office if symptoms are severe. Cannabis overdose is not life-threatening but can be very uncomfortable.", tags: ["overdose", "too much", "anxiety", "safety"] },

  // Side Effects
  { id: "qa-10", category: "Side Effects", question: "What are common side effects?", answer: "Common side effects include: dry mouth (stay hydrated), drowsiness (take at bedtime if needed), dizziness (stand up slowly), increased appetite, and mild euphoria. Most side effects decrease as your body adjusts. Report any persistent or concerning side effects to your care team.", tags: ["side effects", "adverse effects", "common"] },
  { id: "qa-11", category: "Side Effects", question: "Will cannabis make me hungry?", answer: "THC is known to stimulate appetite (commonly called 'the munchies'). This can be a therapeutic benefit for patients with cachexia, cancer, or HIV/AIDS. If unwanted weight gain is a concern, consider: CBD-dominant products (less appetite stimulation), keeping healthy snacks available, or timing doses for after meals.", tags: ["appetite", "munchies", "weight", "THC"] },

  // Legal & Compliance
  { id: "qa-12", category: "Legal & Compliance", question: "Is medical cannabis legal in my state?", answer: "Medical cannabis is legal in the majority of US states, though rules vary significantly. Your provider will verify eligibility based on your state's requirements. Our system tracks state-specific regulations and generates the necessary compliance forms. Check your state's medical cannabis program website for the most current information.", tags: ["legal", "state law", "eligibility"] },
  { id: "qa-13", category: "Legal & Compliance", question: "Can I travel with medical cannabis?", answer: "Cannabis remains illegal under federal law, which means: (1) You cannot fly with cannabis (even between legal states). (2) You cannot cross state lines with cannabis. (3) Within your state, carry your medical card and keep products in original packaging. Some states have reciprocity agreements. Always check local laws before traveling.", tags: ["travel", "flying", "federal law", "interstate"] },

  // Billing
  { id: "qa-14", category: "Billing & Insurance", question: "Does insurance cover medical cannabis?", answer: "Currently, most insurance plans do not cover medical cannabis products because cannabis remains a Schedule I substance under federal law. However, the physician consultation visit itself may be covered as a standard office visit. We'll verify your coverage and provide clear cost information before your appointment.", tags: ["insurance", "coverage", "cost", "billing"] },
  { id: "qa-15", category: "Billing & Insurance", question: "Can I deduct medical cannabis on my taxes?", answer: "Under current federal tax law, medical cannabis expenses are generally NOT deductible because cannabis is a Schedule I substance. However, the medical office visit charges may qualify as deductible medical expenses. Consult a tax professional for guidance specific to your situation. You can find your year-end tax summary in the Billing section of your portal.", tags: ["taxes", "deduction", "IRS", "tax summary"] },

  // Appointments
  { id: "qa-16", category: "Appointments", question: "How do I schedule a follow-up?", answer: "You can schedule follow-up appointments through the portal by navigating to the Schedule section. Select your preferred provider, date, time, and visit type (in-person or telehealth). You'll receive a confirmation email with any pre-visit instructions.", tags: ["schedule", "follow-up", "appointment", "booking"] },
  { id: "qa-17", category: "Appointments", question: "What if I need to cancel or reschedule?", answer: "You can cancel or reschedule through your portal up to 24 hours before your appointment. Late cancellations or no-shows may be subject to a fee. If you're running late, please call our office so we can accommodate you if possible.", tags: ["cancel", "reschedule", "no-show", "late"] },

  // Prescriptions
  { id: "qa-18", category: "Prescriptions", question: "How do I get a refill?", answer: "You can request a refill through the portal messaging system. Send a message to your care team and select 'Refill Request.' Our team will review your request, check your treatment compliance, and process the refill — usually within 1-2 business days. Some states require periodic in-person evaluations for renewals.", tags: ["refill", "renewal", "prescription", "reorder"] },
  { id: "qa-19", category: "Prescriptions", question: "Where can I fill my prescription?", answer: "Medical cannabis prescriptions can only be filled at licensed dispensaries in your state. Your provider may recommend specific dispensaries based on product availability and quality. You'll need to bring your medical card and a valid photo ID to the dispensary.", tags: ["dispensary", "pharmacy", "fill", "where to buy"] },
];

/**
 * Search the Q&A database by keyword.
 */
export function searchQA(query: string): QAEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return QA_DATABASE;

  return QA_DATABASE.filter((entry) =>
    entry.question.toLowerCase().includes(q) ||
    entry.answer.toLowerCase().includes(q) ||
    entry.tags.some((tag) => tag.toLowerCase().includes(q)) ||
    entry.category.toLowerCase().includes(q)
  ).sort((a, b) => {
    // Prioritize question matches over answer matches
    const aQ = a.question.toLowerCase().includes(q) ? 0 : 1;
    const bQ = b.question.toLowerCase().includes(q) ? 0 : 1;
    return aQ - bQ;
  });
}

export function getByCategory(category: string): QAEntry[] {
  return QA_DATABASE.filter((e) => e.category === category);
}
