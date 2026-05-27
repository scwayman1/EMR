-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('cogs_inventory', 'cogs_lab', 'payroll_clinical', 'payroll_admin', 'payroll_taxes', 'benefits', 'rent', 'utilities', 'software', 'insurance', 'marketing', 'legal_professional', 'office_supplies', 'equipment', 'travel', 'meals_entertainment', 'banking_fees', 'taxes_state_local', 'taxes_federal', 'depreciation', 'amortization', 'bad_debt', 'refunds_chargebacks', 'contractor', 'research_development', 'training_education', 'charitable', 'other');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'paid', 'void');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('checking', 'savings', 'merchant', 'credit_card', 'line_of_credit', 'payroll', 'reserves');

-- CreateEnum
CREATE TYPE "CashFlowDirection" AS ENUM ('in', 'out');

-- CreateEnum
CREATE TYPE "CashFlowActivity" AS ENUM ('operating', 'investing', 'financing');

-- CreateEnum
CREATE TYPE "FixedAssetCategory" AS ENUM ('medical_equipment', 'computer_hardware', 'furniture', 'leasehold_improvement', 'vehicle', 'software_capitalized', 'deposit', 'other');

-- CreateEnum
CREATE TYPE "LiabilityType" AS ENUM ('loan_term', 'line_of_credit', 'credit_card', 'accounts_payable', 'payroll_payable', 'tax_payable', 'deferred_revenue', 'capital_lease', 'other');

-- CreateEnum
CREATE TYPE "EquityEntryType" AS ENUM ('capital_contribution', 'distribution', 'retained_earnings_adjustment', 'stock_issuance', 'stock_buyback', 'prior_period_adjustment');

-- CreateEnum
CREATE TYPE "FinancialReportType" AS ENUM ('pnl', 'cash_flow', 'balance_sheet', 'kpi_dashboard', 'cfo_briefing');

-- CreateEnum
CREATE TYPE "FinancialReportPeriod" AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom');

-- CreateEnum
CREATE TYPE "FinancialGoalKind" AS ENUM ('revenue_target', 'gross_margin_target', 'ebitda_target', 'cash_runway_min', 'ar_days_max', 'collection_rate_min', 'custom');

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "vendor" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "bankAccountId" TEXT,
    "receiptUrl" TEXT,
    "invoiceNumber" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'approved',
    "recurringRuleId" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdByUserId" TEXT,
    "createdByAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "vendor" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "cadence" TEXT NOT NULL,
    "dayOfPeriod" INTEGER,
    "bankAccountId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3),
    "lastSpawnedAt" TIMESTAMP(3),
    "nextSpawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BankAccountType" NOT NULL,
    "institution" TEXT,
    "last4" TEXT,
    "openingBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "currentBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "asOfDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlowEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "direction" "CashFlowDirection" NOT NULL,
    "activity" "CashFlowActivity" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "expenseId" TEXT,
    "paymentId" TEXT,
    "orderId" TEXT,
    "liabilityId" TEXT,
    "fixedAssetId" TEXT,
    "equityEntryId" TEXT,
    "metadata" JSONB,
    "createdByAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashFlowEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FixedAssetCategory" NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "acquiredCostCents" INTEGER NOT NULL,
    "salvageValueCents" INTEGER NOT NULL DEFAULT 0,
    "usefulLifeMonths" INTEGER NOT NULL,
    "accumulatedDeprecCents" INTEGER NOT NULL DEFAULT 0,
    "disposedAt" TIMESTAMP(3),
    "disposalProceedsCents" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Liability" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LiabilityType" NOT NULL,
    "principalCents" INTEGER NOT NULL,
    "balanceCents" INTEGER NOT NULL,
    "interestRate" DOUBLE PRECISION,
    "termMonths" INTEGER,
    "monthlyPaymentCents" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Liability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquityEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "EquityEntryType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "ownerName" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquityEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "FinancialReportType" NOT NULL,
    "period" "FinancialReportPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "revenueCents" INTEGER NOT NULL DEFAULT 0,
    "cogsCents" INTEGER NOT NULL DEFAULT 0,
    "grossProfitCents" INTEGER NOT NULL DEFAULT 0,
    "opexCents" INTEGER NOT NULL DEFAULT 0,
    "ebitdaCents" INTEGER NOT NULL DEFAULT 0,
    "netIncomeCents" INTEGER NOT NULL DEFAULT 0,
    "cashCents" INTEGER NOT NULL DEFAULT 0,
    "arCents" INTEGER NOT NULL DEFAULT 0,
    "apCents" INTEGER NOT NULL DEFAULT 0,
    "totalAssetsCents" INTEGER NOT NULL DEFAULT 0,
    "totalLiabilitiesCents" INTEGER NOT NULL DEFAULT 0,
    "totalEquityCents" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "narrative" TEXT,
    "anomalies" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB,

    CONSTRAINT "FinancialReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialGoal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "FinancialGoalKind" NOT NULL,
    "label" TEXT NOT NULL,
    "targetCents" INTEGER,
    "targetPct" DOUBLE PRECISION,
    "targetDays" INTEGER,
    "period" "FinancialReportPeriod" NOT NULL DEFAULT 'monthly',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_organizationId_occurredOn_idx" ON "Expense"("organizationId", "occurredOn");

-- CreateIndex
CREATE INDEX "Expense_organizationId_category_occurredOn_idx" ON "Expense"("organizationId", "category", "occurredOn");

-- CreateIndex
CREATE INDEX "Expense_organizationId_paidAt_idx" ON "Expense"("organizationId", "paidAt");

-- CreateIndex
CREATE INDEX "RecurringExpense_organizationId_active_nextSpawnAt_idx" ON "RecurringExpense"("organizationId", "active", "nextSpawnAt");

-- CreateIndex
CREATE INDEX "BankAccount_organizationId_isActive_idx" ON "BankAccount"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "CashFlowEntry_organizationId_occurredOn_idx" ON "CashFlowEntry"("organizationId", "occurredOn");

-- CreateIndex
CREATE INDEX "CashFlowEntry_organizationId_activity_occurredOn_idx" ON "CashFlowEntry"("organizationId", "activity", "occurredOn");

-- CreateIndex
CREATE INDEX "FixedAsset_organizationId_disposedAt_idx" ON "FixedAsset"("organizationId", "disposedAt");

-- CreateIndex
CREATE INDEX "Liability_organizationId_closedAt_idx" ON "Liability"("organizationId", "closedAt");

-- CreateIndex
CREATE INDEX "Liability_organizationId_type_idx" ON "Liability"("organizationId", "type");

-- CreateIndex
CREATE INDEX "EquityEntry_organizationId_occurredOn_idx" ON "EquityEntry"("organizationId", "occurredOn");

-- CreateIndex
CREATE INDEX "FinancialReport_organizationId_type_periodEnd_idx" ON "FinancialReport"("organizationId", "type", "periodEnd");

-- CreateIndex
CREATE INDEX "FinancialReport_organizationId_generatedAt_idx" ON "FinancialReport"("organizationId", "generatedAt");

-- CreateIndex
CREATE INDEX "FinancialGoal_organizationId_active_idx" ON "FinancialGoal"("organizationId", "active");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "RecurringExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowEntry" ADD CONSTRAINT "CashFlowEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowEntry" ADD CONSTRAINT "CashFlowEntry_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Liability" ADD CONSTRAINT "Liability_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquityEntry" ADD CONSTRAINT "EquityEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialReport" ADD CONSTRAINT "FinancialReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialGoal" ADD CONSTRAINT "FinancialGoal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

