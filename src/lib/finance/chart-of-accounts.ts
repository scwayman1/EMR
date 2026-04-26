import type { ExpenseCategory, FixedAssetCategory, LiabilityType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Chart of Accounts — the canonical roll-up the CFO agent uses to map
// individual expense / asset / liability rows into the line items that
// appear on the P&L, cash flow, and balance sheet.
// ---------------------------------------------------------------------------

export type PnlSection =
  | "revenue"
  | "cogs"
  | "operating_expenses"
  | "non_operating"
  | "depreciation_amortization"
  | "taxes";

export type PnlGroup =
  | "service_revenue"
  | "product_revenue"
  | "other_revenue"
  | "cogs_inventory"
  | "cogs_lab"
  | "payroll"
  | "benefits"
  | "facilities"
  | "technology"
  | "marketing"
  | "professional_services"
  | "general_admin"
  | "depreciation_amortization"
  | "interest"
  | "taxes"
  | "bad_debt";

export interface PnlMapping {
  section: PnlSection;
  group: PnlGroup;
  label: string;
  /** True for non-cash expenses excluded from EBITDA. */
  nonCash?: boolean;
  /** True for items excluded from Operating Income (interest, taxes, gains/losses). */
  belowTheLine?: boolean;
}

const EXPENSE_PNL_MAP: Record<ExpenseCategory, PnlMapping> = {
  cogs_inventory:        { section: "cogs", group: "cogs_inventory", label: "Inventory & products" },
  cogs_lab:              { section: "cogs", group: "cogs_lab", label: "Lab fees & COA testing" },
  payroll_clinical:      { section: "operating_expenses", group: "payroll", label: "Clinical payroll" },
  payroll_admin:         { section: "operating_expenses", group: "payroll", label: "Admin payroll" },
  payroll_taxes:         { section: "operating_expenses", group: "payroll", label: "Payroll taxes" },
  benefits:              { section: "operating_expenses", group: "benefits", label: "Employee benefits" },
  rent:                  { section: "operating_expenses", group: "facilities", label: "Rent" },
  utilities:             { section: "operating_expenses", group: "facilities", label: "Utilities" },
  software:              { section: "operating_expenses", group: "technology", label: "Software & SaaS" },
  insurance:             { section: "operating_expenses", group: "general_admin", label: "Insurance" },
  marketing:             { section: "operating_expenses", group: "marketing", label: "Marketing & advertising" },
  legal_professional:    { section: "operating_expenses", group: "professional_services", label: "Legal & professional" },
  office_supplies:       { section: "operating_expenses", group: "general_admin", label: "Office supplies" },
  equipment:             { section: "operating_expenses", group: "general_admin", label: "Small equipment" },
  travel:                { section: "operating_expenses", group: "general_admin", label: "Travel" },
  meals_entertainment:   { section: "operating_expenses", group: "general_admin", label: "Meals & entertainment" },
  banking_fees:          { section: "non_operating", group: "interest", label: "Banking & merchant fees", belowTheLine: true },
  taxes_state_local:     { section: "taxes", group: "taxes", label: "State & local taxes", belowTheLine: true },
  taxes_federal:         { section: "taxes", group: "taxes", label: "Federal income tax", belowTheLine: true },
  depreciation:          { section: "depreciation_amortization", group: "depreciation_amortization", label: "Depreciation", nonCash: true },
  amortization:          { section: "depreciation_amortization", group: "depreciation_amortization", label: "Amortization", nonCash: true },
  bad_debt:              { section: "operating_expenses", group: "bad_debt", label: "Bad debt expense" },
  refunds_chargebacks:   { section: "operating_expenses", group: "general_admin", label: "Refunds & chargebacks" },
  contractor:            { section: "operating_expenses", group: "professional_services", label: "Contractors" },
  research_development:  { section: "operating_expenses", group: "general_admin", label: "R&D" },
  training_education:    { section: "operating_expenses", group: "general_admin", label: "Training & education" },
  charitable:            { section: "operating_expenses", group: "general_admin", label: "Charitable contributions" },
  other:                 { section: "operating_expenses", group: "general_admin", label: "Other operating" },
};

export function classifyExpense(category: ExpenseCategory): PnlMapping {
  return EXPENSE_PNL_MAP[category];
}

export function pnlGroupLabel(group: PnlGroup): string {
  switch (group) {
    case "service_revenue": return "Clinical service revenue";
    case "product_revenue": return "Product revenue";
    case "other_revenue": return "Other revenue";
    case "cogs_inventory": return "Inventory & products";
    case "cogs_lab": return "Lab fees & COA testing";
    case "payroll": return "Payroll & taxes";
    case "benefits": return "Employee benefits";
    case "facilities": return "Facilities";
    case "technology": return "Technology";
    case "marketing": return "Marketing";
    case "professional_services": return "Professional services";
    case "general_admin": return "General & administrative";
    case "depreciation_amortization": return "Depreciation & amortization";
    case "interest": return "Interest & financing fees";
    case "taxes": return "Income & excise taxes";
    case "bad_debt": return "Bad debt";
  }
}

export type BalanceSheetSection =
  | "current_assets"
  | "long_term_assets"
  | "current_liabilities"
  | "long_term_liabilities"
  | "equity";

export interface BalanceSheetMapping {
  section: BalanceSheetSection;
  label: string;
}

export const FIXED_ASSET_MAP: Record<FixedAssetCategory, BalanceSheetMapping> = {
  medical_equipment:       { section: "long_term_assets", label: "Medical equipment" },
  computer_hardware:       { section: "long_term_assets", label: "Computer hardware" },
  furniture:               { section: "long_term_assets", label: "Furniture & fixtures" },
  leasehold_improvement:   { section: "long_term_assets", label: "Leasehold improvements" },
  vehicle:                 { section: "long_term_assets", label: "Vehicles" },
  software_capitalized:    { section: "long_term_assets", label: "Capitalized software" },
  deposit:                 { section: "long_term_assets", label: "Deposits" },
  other:                   { section: "long_term_assets", label: "Other long-term assets" },
};

export const LIABILITY_MAP: Record<LiabilityType, BalanceSheetMapping> = {
  loan_term:        { section: "long_term_liabilities", label: "Term loans" },
  line_of_credit:   { section: "current_liabilities", label: "Line of credit" },
  credit_card:      { section: "current_liabilities", label: "Credit card balances" },
  accounts_payable: { section: "current_liabilities", label: "Accounts payable" },
  payroll_payable:  { section: "current_liabilities", label: "Payroll payable" },
  tax_payable:      { section: "current_liabilities", label: "Taxes payable" },
  deferred_revenue: { section: "current_liabilities", label: "Deferred revenue" },
  capital_lease:    { section: "long_term_liabilities", label: "Capital leases" },
  other:            { section: "long_term_liabilities", label: "Other liabilities" },
};

/** Cash & equivalents bank account types — appear under current assets. */
export function isCashAccountType(type: string): boolean {
  return type === "checking" || type === "savings" || type === "merchant" || type === "payroll" || type === "reserves";
}

/** Treat credit_card / line_of_credit BankAccount rows as liabilities, not cash. */
export function isLiabilityAccountType(type: string): boolean {
  return type === "credit_card" || type === "line_of_credit";
}
