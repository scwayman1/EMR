/**
 * Backend data extrapolation (EMR-035)
 * ------------------------------------
 * Lightweight statistical helpers that turn a sparse practice signal
 * (revenue per month, patient adds per week, outcome trend) into
 * forward projections for the analytics dashboards.
 *
 * Two estimators ship here:
 *
 *   - linearRegression: ordinary least-squares fit of y on a 0..n-1 x.
 *     Returns slope, intercept, and a per-step variance. Drives the
 *     "expected value next month" projection.
 *
 *   - exponentialSmoothing: simple Holt-style smoothing with trend.
 *     Better for series with non-linear momentum (cohort growth).
 *
 * No dependencies, no I/O — easy to test in isolation.
 */

export interface RegressionFit {
  slope: number;
  intercept: number;
  /** Sample variance of residuals; fed into the prediction interval. */
  residualVariance: number;
  /** R² goodness-of-fit, 0..1. */
  rSquared: number;
}

export function linearRegression(values: number[]): RegressionFit {
  const n = values.length;
  if (n < 2) {
    return { slope: 0, intercept: values[0] ?? 0, residualVariance: 0, rSquared: 0 };
  }
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yhat = slope * i + intercept;
    ssRes += (values[i] - yhat) ** 2;
    ssTot += (values[i] - yMean) ** 2;
  }
  const residualVariance = n > 2 ? ssRes / (n - 2) : 0;
  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  return { slope, intercept, residualVariance, rSquared };
}

export interface Forecast {
  next: number;
  /** Lower / upper bound for a ~95% prediction interval (Z = 1.96). */
  lower: number;
  upper: number;
  rSquared: number;
}

/**
 * One-step-ahead linear forecast with a normal-approx 95% interval.
 *
 * The interval grows as residual variance grows — a noisy series gets
 * a wide band. With <2 data points the forecast is the last value and
 * the band collapses to that point.
 */
export function linearForecast(values: number[]): Forecast {
  if (values.length === 0) {
    return { next: 0, lower: 0, upper: 0, rSquared: 0 };
  }
  const fit = linearRegression(values);
  const n = values.length;
  const next = fit.slope * n + fit.intercept;
  const std = Math.sqrt(fit.residualVariance);
  const z = 1.96;
  return {
    next,
    lower: next - z * std,
    upper: next + z * std,
    rSquared: fit.rSquared,
  };
}

/**
 * Holt's linear exponential smoothing. `alpha` is the level smoothing
 * weight, `beta` is the trend smoothing weight. The single-step
 * forecast is `level + trend`.
 */
export function exponentialSmoothing(
  values: number[],
  alpha = 0.5,
  beta = 0.3,
): { level: number; trend: number; forecast: number } {
  if (values.length === 0) return { level: 0, trend: 0, forecast: 0 };
  if (values.length === 1) return { level: values[0], trend: 0, forecast: values[0] };
  let level = values[0];
  let trend = values[1] - values[0];
  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  return { level, trend, forecast: level + trend };
}

export interface SeasonalDecomposition {
  seasonal: number[];
  trend: number[];
  residual: number[];
  period: number;
}

/**
 * Naive additive decomposition. Trend is a centered moving average;
 * seasonal index is the average de-trended value at each phase of the
 * period. Suitable for weekly visit patterns or monthly billing
 * cycles, where we don't need anything fancier than statsmodels'
 * seasonal_decompose.
 */
export function decomposeSeasonal(
  values: number[],
  period: number,
): SeasonalDecomposition {
  const n = values.length;
  const trend: number[] = Array(n).fill(0);
  const half = Math.floor(period / 2);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n - 1, i + half);
    let sum = 0;
    for (let j = lo; j <= hi; j++) sum += values[j];
    trend[i] = sum / (hi - lo + 1);
  }
  const detrended = values.map((v, i) => v - trend[i]);
  const seasonalIndex: number[] = Array(period).fill(0);
  const seasonalCount: number[] = Array(period).fill(0);
  for (let i = 0; i < n; i++) {
    seasonalIndex[i % period] += detrended[i];
    seasonalCount[i % period]++;
  }
  for (let p = 0; p < period; p++) {
    if (seasonalCount[p] > 0) seasonalIndex[p] /= seasonalCount[p];
  }
  const seasonal = values.map((_, i) => seasonalIndex[i % period]);
  const residual = values.map((v, i) => v - trend[i] - seasonal[i]);
  return { seasonal, trend, residual, period };
}

/**
 * Bin a list of dated values into N evenly-spaced buckets between
 * `from` and `to`. Empty buckets carry zero. Used to project a daily
 * stream of events (claims, outcome logs) onto a fixed monthly grid
 * before forecasting.
 */
export function bucketByDay(
  events: Array<{ at: Date; value: number }>,
  from: Date,
  to: Date,
  bucketCount: number,
): number[] {
  const span = to.getTime() - from.getTime();
  if (span <= 0 || bucketCount <= 0) return [];
  const out = Array(bucketCount).fill(0);
  for (const e of events) {
    if (e.at < from || e.at > to) continue;
    const idx = Math.min(
      bucketCount - 1,
      Math.floor(((e.at.getTime() - from.getTime()) / span) * bucketCount),
    );
    out[idx] += e.value;
  }
  return out;
}
