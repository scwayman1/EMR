# Combo Wheel Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Combo Wheel to an 8x8 layout by seeding `EducationCompound` with 8 cannabinoids and 8 terpenes.

**Architecture:** Append an idempotent `seedEducationCompounds` function to `prisma/seed.ts` that upserts 16 scientifically accurate compound records.

**Tech Stack:** Prisma, TypeScript.

---

### Task 1: Seed Education Compounds

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Write the minimal implementation**

Append this function and call it at the end of `main()` in `prisma/seed.ts`:

```typescript
// Add to the bottom of prisma/seed.ts

async function seedEducationCompounds() {
  const compounds: Omit<Prisma.EducationCompoundCreateInput, "createdAt" | "updatedAt">[] = [
    // Cannabinoids
    {
      id: "thc",
      name: "THC",
      type: "cannabinoid",
      color: "#2D8B5E",
      evidence: "strong",
      description: "The primary psychoactive compound in cannabis, known for potent pain relief and appetite stimulation.",
      symptoms: ["pain", "insomnia", "nausea", "appetite loss"],
      benefits: ["euphoria", "relaxation", "pain relief"],
      risks: ["anxiety", "paranoia", "dry mouth", "impaired memory"],
      sortOrder: 0,
      active: true,
    },
    {
      id: "cbd",
      name: "CBD",
      type: "cannabinoid",
      color: "#3A9F71",
      evidence: "strong",
      description: "Non-intoxicating compound widely used for anxiety, inflammation, and seizure reduction.",
      symptoms: ["anxiety", "inflammation", "seizures", "pain"],
      benefits: ["calmness", "neuroprotection", "anti-inflammatory"],
      risks: ["fatigue", "dry mouth", "appetite changes"],
      sortOrder: 1,
      active: true,
    },
    {
      id: "cbg",
      name: "CBG",
      type: "cannabinoid",
      color: "#46B384",
      evidence: "moderate",
      description: "The 'mother cannabinoid', showing promise for gut health, focus, and neuroprotection.",
      symptoms: ["IBS", "glaucoma", "fatigue"],
      benefits: ["focus", "antibacterial", "appetite stimulation"],
      risks: ["dry mouth", "mild anxiety"],
      sortOrder: 2,
      active: true,
    },
    {
      id: "cbn",
      name: "CBN",
      type: "cannabinoid",
      color: "#53C797",
      evidence: "moderate",
      description: "A degradation product of THC often marketed for sleep and nighttime sedation.",
      symptoms: ["insomnia", "pain", "inflammation"],
      benefits: ["sedation", "relaxation", "pain relief"],
      risks: ["grogginess", "dizziness"],
      sortOrder: 3,
      active: true,
    },
    {
      id: "cbc",
      name: "CBC",
      type: "cannabinoid",
      color: "#5FDBAA",
      evidence: "emerging",
      description: "A non-intoxicating minor cannabinoid believed to boost anandamide and reduce inflammation.",
      symptoms: ["depression", "pain", "acne"],
      benefits: ["mood elevation", "neurogenesis", "anti-inflammatory"],
      risks: ["dry mouth", "mild fatigue"],
      sortOrder: 4,
      active: true,
    },
    {
      id: "thcv",
      name: "THCV",
      type: "cannabinoid",
      color: "#6CEFBD",
      evidence: "emerging",
      description: "Known as 'diet weed', it provides clear-headed, energizing effects and may suppress appetite.",
      symptoms: ["fatigue", "diabetes", "obesity"],
      benefits: ["energy", "focus", "appetite suppression"],
      risks: ["anxiety", "jitteriness"],
      sortOrder: 5,
      active: true,
    },
    {
      id: "cbda",
      name: "CBDa",
      type: "cannabinoid",
      color: "#78FFD0",
      evidence: "emerging",
      description: "The raw, unheated form of CBD, showing high potential for nausea and targeted inflammation relief.",
      symptoms: ["nausea", "inflammation", "anxiety"],
      benefits: ["anti-nausea", "anti-inflammatory"],
      risks: ["fatigue", "dry mouth"],
      sortOrder: 6,
      active: true,
    },
    {
      id: "thca",
      name: "THCa",
      type: "cannabinoid",
      color: "#85FFE3",
      evidence: "emerging",
      description: "The non-intoxicating precursor to THC, valued for its potent anti-inflammatory and neuroprotective traits.",
      symptoms: ["pain", "muscle spasms", "arthritis"],
      benefits: ["anti-inflammatory", "neuroprotection", "anti-emetic"],
      risks: ["mild drowsiness"],
      sortOrder: 7,
      active: true,
    },

    // Terpenes
    {
      id: "myrcene",
      name: "Myrcene",
      type: "terpene",
      color: "#E8A838",
      evidence: "strong",
      description: "The most abundant terpene, delivering an earthy, musky aroma and deep physical sedation.",
      symptoms: ["insomnia", "pain", "muscle spasms"],
      benefits: ["relaxation", "sedation", "anti-inflammatory"],
      risks: ["grogginess", "lethargy"],
      sortOrder: 0,
      active: true,
    },
    {
      id: "limonene",
      name: "Limonene",
      type: "terpene",
      color: "#F2B84D",
      evidence: "strong",
      description: "Bright and citrusy, Limonene is prized for its mood-elevating and stress-relieving properties.",
      symptoms: ["depression", "anxiety", "stress", "nausea"],
      benefits: ["mood elevation", "stress relief", "anti-nausea"],
      risks: ["mild jitteriness", "dry mouth"],
      sortOrder: 1,
      active: true,
    },
    {
      id: "caryophyllene",
      name: "Caryophyllene",
      type: "terpene",
      color: "#FCC862",
      evidence: "strong",
      description: "A spicy, peppery terpene that uniquely acts as a cannabinoid, binding to CB2 receptors to fight inflammation.",
      symptoms: ["pain", "inflammation", "anxiety"],
      benefits: ["pain relief", "anti-inflammatory", "stress relief"],
      risks: ["dry mouth", "mild fatigue"],
      sortOrder: 2,
      active: true,
    },
    {
      id: "linalool",
      name: "Linalool",
      type: "terpene",
      color: "#FFD877",
      evidence: "moderate",
      description: "Recognizable by its floral, lavender scent, Linalool is a powerful calming agent for mind and body.",
      symptoms: ["anxiety", "insomnia", "pain", "seizures"],
      benefits: ["calmness", "sedation", "anti-anxiety"],
      risks: ["grogginess", "lethargy"],
      sortOrder: 3,
      active: true,
    },
    {
      id: "pinene",
      name: "Pinene",
      type: "terpene",
      color: "#FFE88C",
      evidence: "moderate",
      description: "Fresh and piney, Pinene promotes alertness, memory retention, and acts as a bronchodilator.",
      symptoms: ["asthma", "memory loss", "fatigue"],
      benefits: ["focus", "alertness", "bronchodilation"],
      risks: ["anxiety", "restlessness"],
      sortOrder: 4,
      active: true,
    },
    {
      id: "humulene",
      name: "Humulene",
      type: "terpene",
      color: "#FFF8A1",
      evidence: "emerging",
      description: "Woody and earthy (found in hops), Humulene is notable for its anti-inflammatory and appetite-suppressing effects.",
      symptoms: ["inflammation", "pain", "obesity"],
      benefits: ["anti-inflammatory", "appetite suppression", "antibacterial"],
      risks: ["dry mouth", "mild fatigue"],
      sortOrder: 5,
      active: true,
    },
    {
      id: "terpinolene",
      name: "Terpinolene",
      type: "terpene",
      color: "#FFFFB6",
      evidence: "emerging",
      description: "Complex and fruity, Terpinolene often acts as a mild central nervous system depressant and antioxidant.",
      symptoms: ["insomnia", "anxiety", "oxidative stress"],
      benefits: ["sedation", "antioxidant", "antibacterial"],
      risks: ["grogginess", "mild dizziness"],
      sortOrder: 6,
      active: true,
    },
    {
      id: "ocimene",
      name: "Ocimene",
      type: "terpene",
      color: "#FFFFCB",
      evidence: "emerging",
      description: "Sweet and herbaceous, Ocimene offers uplifting effects along with antiviral and decongestant benefits.",
      symptoms: ["congestion", "viruses", "fatigue"],
      benefits: ["uplifting", "decongestant", "antiviral"],
      risks: ["mild anxiety", "dry mouth"],
      sortOrder: 7,
      active: true,
    },
  ];

  let added = 0;
  for (const comp of compounds) {
    await prisma.educationCompound.upsert({
      where: { id: comp.id },
      update: comp,
      create: comp,
    });
    added++;
  }
  console.log(`  Education: Seeded ${added} Combo Wheel compounds.`);
}
```

Find the `main()` function execution at the bottom of the file (usually inside `.then(async () => { ... })` or similar, or just a `async function main()`) and make sure to call `await seedEducationCompounds();`.
Look for `await seedTrack8Data(organization.id, patients.map(p => p.id));` and append it right after.

- [ ] **Step 2: Run test to verify it passes**

Run: `npx prisma db seed`
Expected: Output showing "Education: Seeded 16 Combo Wheel compounds."

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(education): EMR-327 seed combo wheel expansion"
```
