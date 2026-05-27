import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Combo Wheel compounds...");

  await prisma.educationCompound.deleteMany({});

  const compounds = [
    {
      id: "comp_thc",
      name: "THC",
      type: "cannabinoid",
      color: "bg-emerald-500",
      evidence: "strong",
      description: "Primary psychoactive compound, known for pain relief and appetite stimulation.",
      symptoms: ["Pain", "Nausea", "Appetite Loss", "Insomnia"],
      benefits: ["Pain Relief", "Sleep Aid", "Appetite Stimulation", "Muscle Relaxation"],
      risks: ["Anxiety", "Paranoia", "Dry Mouth", "Red Eyes", "Impaired Memory"],
      active: true,
      sortOrder: 1,
    },
    {
      id: "comp_cbd",
      name: "CBD",
      type: "cannabinoid",
      color: "bg-sky-500",
      evidence: "strong",
      description: "Non-intoxicating compound with broad anti-inflammatory and anxiolytic properties.",
      symptoms: ["Anxiety", "Inflammation", "Seizures", "Pain"],
      benefits: ["Anxiety Reduction", "Anti-inflammatory", "Seizure Reduction"],
      risks: ["Fatigue", "Changes in Appetite", "Diarrhea (at high doses)"],
      active: true,
      sortOrder: 2,
    },
    {
      id: "comp_cbn",
      name: "CBN",
      type: "cannabinoid",
      color: "bg-indigo-500",
      evidence: "emerging",
      description: "A mildly psychoactive degradation product of THC, often used for sleep.",
      symptoms: ["Insomnia", "Pain"],
      benefits: ["Sleep Aid", "Pain Relief", "Antibacterial"],
      risks: ["Mild Grogginess", "Sedation"],
      active: true,
      sortOrder: 3,
    },
    {
      id: "comp_cbg",
      name: "CBG",
      type: "cannabinoid",
      color: "bg-amber-500",
      evidence: "emerging",
      description: "The 'mother of all cannabinoids', shows promise for inflammation and anxiety.",
      symptoms: ["Inflammation", "Anxiety", "Glaucoma"],
      benefits: ["Anti-inflammatory", "Neuroprotective", "Appetite Stimulation"],
      risks: ["Dry Mouth", "Mild Appetite Changes"],
      active: true,
      sortOrder: 4,
    },
    {
      id: "comp_myrcene",
      name: "Myrcene",
      type: "terpene",
      color: "bg-green-600",
      evidence: "moderate",
      description: "The most common terpene, known for earthy aromas and relaxing, sedative effects.",
      symptoms: ["Insomnia", "Pain", "Muscle Spasms"],
      benefits: ["Sedation", "Muscle Relaxation", "Pain Relief"],
      risks: ["Lethargy"],
      active: true,
      sortOrder: 5,
    },
    {
      id: "comp_limonene",
      name: "Limonene",
      type: "terpene",
      color: "bg-yellow-500",
      evidence: "moderate",
      description: "Citrus-scented terpene often associated with mood elevation and stress relief.",
      symptoms: ["Depression", "Anxiety", "Stress", "Gastric Reflux"],
      benefits: ["Mood Elevation", "Stress Relief", "Antifungal"],
      risks: ["Mild Stimulation"],
      active: true,
      sortOrder: 6,
    },
    {
      id: "comp_linalool",
      name: "Linalool",
      type: "terpene",
      color: "bg-purple-500",
      evidence: "moderate",
      description: "Floral terpene found in lavender, renowned for calming and anti-anxiety effects.",
      symptoms: ["Anxiety", "Insomnia", "Stress"],
      benefits: ["Calming", "Anti-anxiety", "Pain Relief"],
      risks: ["Sedation"],
      active: true,
      sortOrder: 7,
    },
    {
      id: "comp_pinene",
      name: "Pinene",
      type: "terpene",
      color: "bg-teal-500",
      evidence: "emerging",
      description: "Pine-scented terpene that may promote alertness and counteract some THC memory effects.",
      symptoms: ["Asthma", "Brain Fog", "Inflammation"],
      benefits: ["Bronchodilator", "Alertness", "Memory Support"],
      risks: ["Overstimulation"],
      active: true,
      sortOrder: 8,
    },
    {
      id: "comp_caryophyllene",
      name: "Caryophyllene",
      type: "terpene",
      color: "bg-orange-500",
      evidence: "moderate",
      description: "Peppery terpene that uniquely binds to CB2 receptors, reducing inflammation.",
      symptoms: ["Pain", "Inflammation", "Anxiety"],
      benefits: ["Anti-inflammatory", "Pain Relief", "Gastroprotective"],
      risks: ["None notable"],
      active: true,
      sortOrder: 9,
    },
  ];

  for (const c of compounds) {
    await prisma.educationCompound.create({
      data: c as any,
    });
  }

  console.log(`Seeded ${compounds.length} compounds.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
