/**
 * Cannabis Tax Calculator
 * 
 * Computes state-specific excise and sales taxes for Leafmart checkouts.
 * Medical cannabis is often tax-exempt or taxed at a lower rate, while 
 * adult-use (recreational) has heavy excise taxes.
 * 
 * Note: Local municipality taxes are estimated at an average of 3% where 
 * applicable, but full address verification is required for exact local rates.
 */

export type ProductTaxType = "medical_cannabis" | "adult_use_cannabis" | "wellness_cbd" | "accessory";

export interface TaxCalculationParams {
  stateCode: string;
  subtotal: number;
  productType: ProductTaxType;
  hasMedicalCard?: boolean;
}

export interface TaxResult {
  stateSalesTax: number;
  exciseTax: number;
  localTaxEstimate: number;
  totalTax: number;
  isMedicalExempt: boolean;
}

// State tax rates (Simplified for V1 - typically managed by a service like Avalara)
const TAX_RATES: Record<string, {
  salesTax: number;
  exciseTax: number;
  medicalExemptFromExcise: boolean;
  medicalExemptFromSales: boolean;
}> = {
  "CA": {
    salesTax: 0.0725,
    exciseTax: 0.15,
    medicalExemptFromExcise: false, // In CA, medical patients still pay excise, but exempt from sales with MMIC
    medicalExemptFromSales: true,
  },
  "CO": {
    salesTax: 0.029,
    exciseTax: 0.15,
    medicalExemptFromExcise: true,
    medicalExemptFromSales: false, // Medical pays 2.9% state sales tax, exempt from 15% retail tax
  },
  "IL": {
    salesTax: 0.0625,
    exciseTax: 0.20, // Averages 10-25% based on THC content. Using 20% flat for V1.
    medicalExemptFromExcise: true,
    medicalExemptFromSales: false, // Medical pays 1% qualifying drug tax, approximated to 0 here for simplicity
  },
  "MA": {
    salesTax: 0.0625,
    exciseTax: 0.1075,
    medicalExemptFromExcise: true,
    medicalExemptFromSales: true,
  },
  "MI": {
    salesTax: 0.06,
    exciseTax: 0.10,
    medicalExemptFromExcise: true,
    medicalExemptFromSales: false,
  },
  "NY": {
    salesTax: 0.04,
    exciseTax: 0.13,
    medicalExemptFromExcise: true,
    medicalExemptFromSales: true, // Medical is 7% excise paid by distributor, 0% to patient
  },
};

export function calculateTaxes({
  stateCode,
  subtotal,
  productType,
  hasMedicalCard = false,
}: TaxCalculationParams): TaxResult {
  // Non-cannabis items only pay standard sales tax
  if (productType === "wellness_cbd" || productType === "accessory") {
    const rate = TAX_RATES[stateCode]?.salesTax || 0.05; // Fallback to 5%
    const salesTax = subtotal * rate;
    return {
      stateSalesTax: salesTax,
      exciseTax: 0,
      localTaxEstimate: 0,
      totalTax: salesTax,
      isMedicalExempt: false,
    };
  }

  const rates = TAX_RATES[stateCode] || {
    salesTax: 0.06,
    exciseTax: 0.10,
    medicalExemptFromExcise: false,
    medicalExemptFromSales: false,
  };

  const isMedicalUser = hasMedicalCard || productType === "medical_cannabis";
  
  let salesTaxRate = rates.salesTax;
  let exciseTaxRate = rates.exciseTax;

  if (isMedicalUser) {
    if (rates.medicalExemptFromSales) salesTaxRate = 0;
    if (rates.medicalExemptFromExcise) exciseTaxRate = 0;
  }

  const stateSalesTax = subtotal * salesTaxRate;
  const exciseTax = subtotal * exciseTaxRate;
  
  // Local municipalities generally add ~2-3% on top of state.
  // In a production environment, this is queried via zip code.
  const localTaxRate = isMedicalUser && rates.medicalExemptFromSales ? 0 : 0.03;
  const localTaxEstimate = subtotal * localTaxRate;

  const totalTax = stateSalesTax + exciseTax + localTaxEstimate;

  return {
    stateSalesTax,
    exciseTax,
    localTaxEstimate,
    totalTax,
    isMedicalExempt: isMedicalUser,
  };
}
