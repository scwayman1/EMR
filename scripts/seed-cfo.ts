// CFO demo seed — populates bank accounts, expenses, fixed assets, liabilities,
// equity entries, recurring expenses, and goals so the CFO dashboard renders
// against realistic numbers. Idempotent: deletes existing CFO-only rows for
// the chosen org before re-seeding.
//
// Usage:
//   npx tsx scripts/seed-cfo.ts             — seeds the first organization
//   npx tsx scripts/seed-cfo.ts --org=ABCID — seeds a specific org

import { PrismaClient } from "@prisma/client";
import { cfoAgent } from "../src/lib/agents/cfo-agent";
import { createLightContext } from "../src/lib/orchestration/context";

const prisma = new PrismaClient();

const argOrg = process.argv.find((a) => a.startsWith("--org="))?.split("=")[1];
const argSkipAgent = process.argv.includes("--skip-agent");

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

function pickRand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const org = argOrg
    ? await prisma.organization.findUnique({ where: { id: argOrg } })
    : await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });

  if (!org) {
    console.error("No organization found.");
    process.exit(1);
  }

  console.log(`Seeding CFO demo data for org: ${org.name} (${org.id})`);

  // ── Reset CFO-only rows ──────────────────────────────────────
  await prisma.financialReport.deleteMany({ where: { organizationId: org.id } });
  await prisma.cashFlowEntry.deleteMany({ where: { organizationId: org.id } });
  await prisma.expense.deleteMany({ where: { organizationId: org.id } });
  await prisma.recurringExpense.deleteMany({ where: { organizationId: org.id } });
  await prisma.equityEntry.deleteMany({ where: { organizationId: org.id } });
  await prisma.fixedAsset.deleteMany({ where: { organizationId: org.id } });
  await prisma.liability.deleteMany({ where: { organizationId: org.id } });
  await prisma.financialGoal.deleteMany({ where: { organizationId: org.id } });
  await prisma.bankAccount.deleteMany({ where: { organizationId: org.id } });

  // ── Bank accounts ───────────────────────────────────────────
  const checking = await prisma.bankAccount.create({
    data: {
      organizationId: org.id,
      name: "Operating checking",
      type: "checking",
      institution: "Mercury",
      last4: "4421",
      openingBalanceCents: 5_000_000,
      currentBalanceCents: 18_245_310,
      asOfDate: new Date(),
    },
  });
  const savings = await prisma.bankAccount.create({
    data: {
      organizationId: org.id,
      name: "Tax reserves",
      type: "reserves",
      institution: "Mercury",
      last4: "8893",
      openingBalanceCents: 0,
      currentBalanceCents: 4_500_000,
      asOfDate: new Date(),
    },
  });
  const merchant = await prisma.bankAccount.create({
    data: {
      organizationId: org.id,
      name: "Stripe merchant",
      type: "merchant",
      institution: "Stripe",
      openingBalanceCents: 0,
      currentBalanceCents: 1_120_400,
      asOfDate: new Date(),
    },
  });
  const card = await prisma.bankAccount.create({
    data: {
      organizationId: org.id,
      name: "Amex Plum card",
      type: "credit_card",
      institution: "American Express",
      last4: "1009",
      currentBalanceCents: 1_842_730,
      asOfDate: new Date(),
    },
  });

  console.log("✓ Bank accounts seeded");

  // ── Equity (founder capital) ───────────────────────────────
  await prisma.equityEntry.createMany({
    data: [
      {
        organizationId: org.id,
        type: "capital_contribution",
        amountCents: 25_000_000,
        occurredOn: daysAgo(360),
        ownerName: "Dr. Patel",
        description: "Initial founder capital — Series Seed",
      },
      {
        organizationId: org.id,
        type: "capital_contribution",
        amountCents: 15_000_000,
        occurredOn: daysAgo(180),
        ownerName: "Co-founder bridge",
        description: "Bridge round — added working capital for clinic expansion",
      },
    ],
  });

  // ── Liabilities ────────────────────────────────────────────
  await prisma.liability.create({
    data: {
      organizationId: org.id,
      name: "SBA Express loan",
      type: "loan_term",
      principalCents: 15_000_000,
      balanceCents: 12_400_000,
      interestRate: 0.085,
      termMonths: 84,
      monthlyPaymentCents: 235_000,
      startDate: daysAgo(220),
      maturityDate: new Date(Date.now() + 84 * 30 * 86_400_000),
    },
  });
  await prisma.liability.create({
    data: {
      organizationId: org.id,
      name: "Wholesale vendor AP",
      type: "accounts_payable",
      principalCents: 850_000,
      balanceCents: 582_400,
      startDate: daysAgo(45),
    },
  });

  // ── Fixed assets ───────────────────────────────────────────
  const assets: Array<{ name: string; cat: any; cost: number; life: number; days: number }> = [
    { name: "Examination room buildout", cat: "leasehold_improvement", cost: 8_500_000, life: 84, days: 200 },
    { name: "EKG machine", cat: "medical_equipment", cost: 1_250_000, life: 60, days: 120 },
    { name: "Lab centrifuge", cat: "medical_equipment", cost: 480_000, life: 60, days: 60 },
    { name: "Clinician laptop fleet (8x)", cat: "computer_hardware", cost: 1_980_000, life: 36, days: 90 },
    { name: "Reception furniture", cat: "furniture", cost: 720_000, life: 60, days: 200 },
    { name: "Long Beach lease deposit", cat: "deposit", cost: 1_500_000, life: 240, days: 200 },
  ];
  for (const a of assets) {
    await prisma.fixedAsset.create({
      data: {
        organizationId: org.id,
        name: a.name,
        category: a.cat,
        purchaseDate: daysAgo(a.days),
        acquiredCostCents: a.cost,
        salvageValueCents: 0,
        usefulLifeMonths: a.life,
      },
    });
  }

  // ── Recurring + posted expenses ────────────────────────────
  const monthlyExpenses: Array<{ vendor: string; cat: any; amount: number; description: string }> = [
    { vendor: "Long Beach Medical Plaza", cat: "rent", amount: 1_250_000, description: "Clinic rent" },
    { vendor: "Southern California Edison", cat: "utilities", amount: 84_000, description: "Electric & gas" },
    { vendor: "AT&T Business", cat: "utilities", amount: 32_000, description: "Internet & phone" },
    { vendor: "Athena Health", cat: "software", amount: 220_000, description: "EHR + billing" },
    { vendor: "OpenRouter", cat: "software", amount: 45_000, description: "Agent LLM API" },
    { vendor: "Anthropic", cat: "software", amount: 85_000, description: "ChatCB + CFO agent compute" },
    { vendor: "Vercel", cat: "software", amount: 18_000, description: "Hosting" },
    { vendor: "Supabase", cat: "software", amount: 12_500, description: "Database & storage" },
    { vendor: "ProAssurance", cat: "insurance", amount: 320_000, description: "Malpractice insurance" },
    { vendor: "Hartford", cat: "insurance", amount: 95_000, description: "Business liability" },
    { vendor: "Gusto", cat: "software", amount: 28_000, description: "Payroll software" },
    { vendor: "QuickBooks", cat: "software", amount: 9_500, description: "Accounting" },
  ];

  // Last 90 days of monthly expenses (3 cycles)
  for (let cycle = 0; cycle < 3; cycle++) {
    const dayOffset = 5 + cycle * 30;
    for (const e of monthlyExpenses) {
      await prisma.expense.create({
        data: {
          organizationId: org.id,
          category: e.cat,
          vendor: e.vendor,
          description: e.description,
          amountCents: e.amount,
          totalCents: e.amount,
          occurredOn: daysAgo(dayOffset),
          paidAt: daysAgo(dayOffset - 1),
          paymentMethod: pickRand(["ach", "card", "wire"]),
          bankAccountId: e.vendor === "Long Beach Medical Plaza" ? checking.id : pickRand([checking.id, card.id]),
          status: "paid",
        },
      });
    }
  }

  // Biweekly clinical payroll
  for (let cycle = 0; cycle < 6; cycle++) {
    const day = 7 + cycle * 14;
    await prisma.expense.create({
      data: {
        organizationId: org.id,
        category: "payroll_clinical",
        vendor: "Gusto · Clinical payroll",
        description: `Biweekly clinical payroll`,
        amountCents: 4_200_000,
        totalCents: 4_200_000,
        occurredOn: daysAgo(day),
        paidAt: daysAgo(day),
        paymentMethod: "ach",
        bankAccountId: checking.id,
        status: "paid",
      },
    });
    await prisma.expense.create({
      data: {
        organizationId: org.id,
        category: "payroll_admin",
        vendor: "Gusto · Admin payroll",
        description: `Biweekly admin payroll`,
        amountCents: 2_300_000,
        totalCents: 2_300_000,
        occurredOn: daysAgo(day),
        paidAt: daysAgo(day),
        paymentMethod: "ach",
        bankAccountId: checking.id,
        status: "paid",
      },
    });
    await prisma.expense.create({
      data: {
        organizationId: org.id,
        category: "payroll_taxes",
        vendor: "IRS / EDD",
        description: `Employer payroll taxes`,
        amountCents: 720_000,
        totalCents: 720_000,
        occurredOn: daysAgo(day),
        paidAt: daysAgo(day),
        paymentMethod: "ach",
        bankAccountId: checking.id,
        status: "paid",
      },
    });
  }

  // Marketing campaigns (variable spend)
  for (const offset of [3, 14, 28, 45, 62, 78]) {
    await prisma.expense.create({
      data: {
        organizationId: org.id,
        category: "marketing",
        vendor: pickRand(["Google Ads", "Meta Ads", "Reddit Ads"]),
        description: `${pickRand(["Search", "Display", "Reels"])} campaign`,
        amountCents: 80_000 + Math.floor(Math.random() * 200_000),
        totalCents: 80_000 + Math.floor(Math.random() * 200_000),
        occurredOn: daysAgo(offset),
        paidAt: daysAgo(offset),
        paymentMethod: "card",
        bankAccountId: card.id,
        status: "paid",
      },
    });
  }

  // COGS — lab fees + inventory
  for (const offset of [4, 11, 18, 25, 32, 39, 46, 53, 60, 67]) {
    await prisma.expense.create({
      data: {
        organizationId: org.id,
        category: "cogs_lab",
        vendor: "ABC Cannabis Lab",
        description: "COA testing batch",
        amountCents: 145_000,
        totalCents: 145_000,
        occurredOn: daysAgo(offset),
        paidAt: daysAgo(offset - 2),
        paymentMethod: "ach",
        bankAccountId: checking.id,
        status: "paid",
      },
    });
  }
  for (const offset of [9, 23, 37, 51, 65, 79]) {
    await prisma.expense.create({
      data: {
        organizationId: org.id,
        category: "cogs_inventory",
        vendor: "Verde Wholesale",
        description: "Tincture & capsule inventory restock",
        amountCents: 320_000 + Math.floor(Math.random() * 180_000),
        totalCents: 320_000 + Math.floor(Math.random() * 180_000),
        occurredOn: daysAgo(offset),
        paidAt: daysAgo(offset - 5),
        paymentMethod: "ach",
        bankAccountId: checking.id,
        status: "paid",
      },
    });
  }

  // Legal / professional / one-offs
  await prisma.expense.create({
    data: {
      organizationId: org.id,
      category: "legal_professional",
      vendor: "Adler & Adler PC",
      description: "California cannabis-care compliance opinion",
      amountCents: 425_000,
      totalCents: 425_000,
      occurredOn: daysAgo(35),
      paidAt: daysAgo(33),
      paymentMethod: "wire",
      bankAccountId: checking.id,
      status: "paid",
    },
  });
  await prisma.expense.create({
    data: {
      organizationId: org.id,
      category: "legal_professional",
      vendor: "Wilson CPAs",
      description: "Q1 tax prep + financial review",
      amountCents: 285_000,
      totalCents: 285_000,
      occurredOn: daysAgo(20),
      paidAt: daysAgo(18),
      paymentMethod: "ach",
      bankAccountId: checking.id,
      status: "paid",
    },
  });
  await prisma.expense.create({
    data: {
      organizationId: org.id,
      category: "banking_fees",
      vendor: "Stripe",
      description: "Card processing fees",
      amountCents: 142_500,
      totalCents: 142_500,
      occurredOn: daysAgo(15),
      paidAt: daysAgo(15),
      paymentMethod: "ach",
      bankAccountId: merchant.id,
      status: "paid",
    },
  });

  console.log("✓ Expenses seeded");

  // ── Recurring templates ────────────────────────────────────
  await prisma.recurringExpense.create({
    data: {
      organizationId: org.id,
      category: "rent",
      vendor: "Long Beach Medical Plaza",
      description: "Monthly clinic rent",
      amountCents: 1_250_000,
      cadence: "monthly",
      dayOfPeriod: 1,
      bankAccountId: checking.id,
      startsOn: daysAgo(360),
      nextSpawnAt: new Date(new Date().setDate(new Date().getDate() + 5)),
    },
  });
  await prisma.recurringExpense.create({
    data: {
      organizationId: org.id,
      category: "payroll_clinical",
      vendor: "Gusto · Clinical payroll",
      description: "Biweekly clinical payroll",
      amountCents: 4_200_000,
      cadence: "biweekly",
      bankAccountId: checking.id,
      startsOn: daysAgo(360),
      nextSpawnAt: new Date(new Date().setDate(new Date().getDate() + 7)),
    },
  });
  console.log("✓ Recurring templates seeded");

  // ── Cash flow entries: SBA loan inflow + monthly debt service ───
  await prisma.cashFlowEntry.create({
    data: {
      organizationId: org.id,
      direction: "in",
      activity: "financing",
      amountCents: 15_000_000,
      description: "SBA Express loan funding",
      occurredOn: daysAgo(220),
      bankAccountId: checking.id,
    },
  });
  for (let m = 1; m <= 7; m++) {
    await prisma.cashFlowEntry.create({
      data: {
        organizationId: org.id,
        direction: "out",
        activity: "financing",
        amountCents: 235_000,
        description: "SBA Express loan principal & interest",
        occurredOn: daysAgo(220 - m * 30),
        bankAccountId: checking.id,
      },
    });
  }

  // ── Goals ─────────────────────────────────────────────────
  await prisma.financialGoal.createMany({
    data: [
      {
        organizationId: org.id,
        kind: "revenue_target",
        label: "Q2 monthly revenue target",
        period: "monthly",
        targetCents: 18_000_000,
        notes: "Stretch goal to fund the next provider hire.",
      },
      {
        organizationId: org.id,
        kind: "gross_margin_target",
        label: "Gross margin floor",
        period: "monthly",
        targetPct: 65,
        notes: "Cannabis-care benchmark.",
      },
      {
        organizationId: org.id,
        kind: "ebitda_target",
        label: "EBITDA target",
        period: "monthly",
        targetCents: 3_000_000,
      },
      {
        organizationId: org.id,
        kind: "cash_runway_min",
        label: "Minimum runway",
        period: "monthly",
        targetDays: 180,
        notes: "Never let cash drop below 6 months of operating burn.",
      },
    ],
  });
  console.log("✓ Goals seeded");

  // ── Run the CFO agent once so the dashboard has a briefing ─
  if (!argSkipAgent) {
    try {
      const ctx = createLightContext({ organizationId: org.id });
      const out = await cfoAgent.run({ organizationId: org.id, period: "weekly" }, ctx);
      console.log(`✓ CFO agent generated briefing ${out.reportIds.briefing}`);
      console.log(`  Revenue: $${(out.metrics.revenueCents / 100).toLocaleString()}`);
      console.log(`  EBITDA: $${(out.metrics.ebitdaCents / 100).toLocaleString()}`);
      console.log(`  Cash: $${(out.metrics.cashCents / 100).toLocaleString()}`);
      console.log(`  Anomalies: ${out.anomalies.length}`);
    } catch (err) {
      console.warn("CFO agent run failed (data was still seeded):", err);
    }
  }

  console.log("\nCFO demo seed complete. Visit /ops/cfo to view.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
