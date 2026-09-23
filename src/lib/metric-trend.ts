import type { MetricId, Observation } from "../types/metric";
import { finiteValue } from "./choropleth";
import { buildMapComparableMetricLookup } from "./map-comparable-observations";

export interface TrendPoint {
  year: number;
  value: number | null;
}

export interface MetricRank {
  position: number;
  total: number;
}

export function trendPoints(
  observations: readonly Observation[], regionId: string, metricId: MetricId,
): TrendPoint[] {
  const points = new Map<number, number | null>();
  observations
    .filter((observation) => observation.regionId === regionId && observation.metricId === metricId)
    .sort((first, second) => first.year - second.year)
    .forEach((observation) => points.set(observation.year, finiteValue(observation.value)));
  return [...points].map(([year, value]) => ({ year, value }));
}

export interface TrendRange {
  fromYear: number;
  toYear: number;
}

export function selectableTrendYears(points: readonly TrendPoint[]): number[] {
  return points
    .filter((point): point is TrendPoint & { value: number } => point.value !== null)
    .map((point) => point.year);
}

export function sharedSelectableTrendYears(...series: readonly (readonly TrendPoint[])[]): number[] {
  if (!series.length) return [];
  const [first, ...rest] = series.map((points) => new Set(selectableTrendYears(points)));
  return [...first].filter((year) => rest.every((years) => years.has(year))).sort((a, b) => a - b);
}

export function defaultTrendRangeForYears(years: readonly number[], activeYear: number): TrendRange | null {
  if (!years.length) return null;
  const sortedYears = [...new Set(years)].sort((a, b) => a - b);
  const yearsAtOrBeforeActive = sortedYears.filter((year) => year <= activeYear);
  const toYear = sortedYears.includes(activeYear) ? activeYear : (yearsAtOrBeforeActive.at(-1) ?? sortedYears.at(-1)!);
  const rangeYears = sortedYears.filter((year) => year <= toYear);
  const fromYear = rangeYears.filter((year) => year <= toYear - 10).at(-1) ?? rangeYears[0];
  return { fromYear, toYear };
}

export function defaultTrendRange(points: readonly TrendPoint[], activeYear: number): TrendRange | null {
  return defaultTrendRangeForYears(selectableTrendYears(points), activeYear);
}

export function metricDifference(first: number | null, second: number | null): { value: number; percent: number | null } | null {
  const firstValue = finiteValue(first);
  const secondValue = finiteValue(second);
  if (firstValue === null || secondValue === null) return null;
  const value = firstValue - secondValue;
  return { value, percent: secondValue === 0 ? null : (value / Math.abs(secondValue)) * 100 };
}

export function filterTrendRange(points: readonly TrendPoint[], range: TrendRange | null): TrendPoint[] {
  if (!range) return [];
  return points.filter((point) => point.year >= range.fromYear && point.year <= range.toYear);
}

export function changeOverPeriod(points: readonly TrendPoint[], mode: "relative" | "percentagePoints" = "relative"): { value: number; sinceYear: number } | null {
  const valid = points.filter((point): point is TrendPoint & { value: number } => point.value !== null);
  if (valid.length < 2 || (mode === "relative" && valid[0].value === 0)) return null;
  const first = valid[0];
  const latest = valid[valid.length - 1];
  return { value: mode === "percentagePoints" ? latest.value - first.value : ((latest.value - first.value) / Math.abs(first.value)) * 100, sinceYear: first.year };
}

export function metricRank(
  observations: readonly Observation[], metricId: MetricId, year: number, regionId: string,
  direction: "higher" | "lower", selectableRegionIds: ReadonlySet<string>,
): MetricRank | null {
  const values = new Map<string, number>();
  buildMapComparableMetricLookup(observations, metricId, year, selectableRegionIds).forEach((value, id) => {
    if (value !== null) values.set(id, value);
  });
  if (!values.has(regionId)) return null;
  const ranked = [...values].sort(([firstId, firstValue], [secondId, secondValue]) =>
    (direction === "higher" ? secondValue - firstValue : firstValue - secondValue) || firstId.localeCompare(secondId));
  return { position: ranked.findIndex(([id]) => id === regionId) + 1, total: ranked.length };
}
