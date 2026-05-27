export type ComparisonMode = "prior_period" | "prior_year" | "none";

export interface CohortFilter {
  dateRange?: { start: Date; end: Date };
  providerId?: string;
  diagnosisCodes?: string[];
}

export interface MetricData {
  id: string;
  title: string;
  currentValue: number | string;
  previousValue?: number | string;
  trendPercentage?: number;
  format: "number" | "currency" | "percentage" | "time";
  drilldownUrl: string; // Defaults to a filtered patient list
}

export interface CanopyCellProps {
  metric: MetricData;
  comparisonMode?: ComparisonMode;
  cellCohortOverride?: CohortFilter;
  isLoading?: boolean;
}
