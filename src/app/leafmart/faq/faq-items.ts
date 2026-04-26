export interface FaqItemData {
  q: string;
  a: string;
  id?: string;
}

export const FAQ_ITEMS: FaqItemData[] = [
  { q: "What is Leafmart?", a: "Leafmart is a clinician-curated cannabis wellness marketplace operated by Leafjourney Health. Every product is reviewed by a licensed physician, verified by a third-party lab, and ranked by real patient outcomes from the Leafjourney care platform." },
  { q: "Who reviews the products?", a: "Products are reviewed by the Leafjourney clinical team — licensed physicians who also write treatment plans for patients in our cannabis care platform. The standards are the same ones they apply in clinical practice." },
  { q: "What does 'lab verified' mean?", a: "Every product on Leafmart has a current Certificate of Analysis (COA) from a third-party testing lab. This covers potency, terpene profiles, residual solvents, pesticides, and heavy metals. If we can't verify the lab work, we don't list the product.", id: "lab-testing" },
  { q: "How does clinician review work?", a: "Our medical team reviews the formulation, ingredients, delivery format, and dosing for every product before it reaches the shelf. They also write clinician notes that appear on each product page, summarizing their review.", id: "clinician-review" },
  { q: "What does 'outcome informed' mean?", a: "Rankings on Leafmart are influenced by de-identified patient outcomes from the Leafjourney care platform. When patients report improvement from a specific product type, that signal helps shape what we recommend." },
  { q: "Do you ship nationally?", a: "Hemp-derived products (those containing less than 0.3% THC by dry weight) ship nationally where permitted by state law. Licensed cannabis products are available intrastate only, subject to your state's regulations.", id: "shipping" },
  { q: "What's your return policy?", a: "Unopened products can be returned within 30 days of delivery. Due to the nature of consumable products, opened items cannot be returned but may be eligible for store credit if there's a quality concern.", id: "returns" },
  { q: "Do I need to be 21+?", a: "Age requirements depend on the product and your state's regulations. Hemp-derived CBD products may be available to those 18+, while THC-containing products require you to be 21+ in all jurisdictions.", id: "age" },
  { q: "How do I contact support?", a: "Email us at support@leafmart.com or use the contact form in your account. We typically respond within one business day.", id: "contact" },
  { q: "What states do you operate in?", a: "Hemp-derived products ship to all 50 states where permitted. Licensed cannabis products are currently available in states where Leafjourney Health operates clinical programs. Check our state availability page for the latest.", id: "states" },
];
