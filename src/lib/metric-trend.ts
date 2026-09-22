import type { MetricId, Observation } from "../types/metric";
import { finiteValue } from "./choropleth";

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

export function defaultTrendRange(points: readonly TrendPoint[], activeYear: number): TrendRange | null {
  const years = selectableTrendYears(points);
  if (!years.length) return null;

  const yearsAtOrBeforeActive = years.filter((year) => year <= activeYear);
  const toYear = years.includes(activeYear) ? activeYear : (yearsAtOrBeforeActive.at(-1) ?? years.at(-1)!);
  const rangeYears = years.filter((year) => year <= toYear);
  const fromYear = rangeYears.filter((year) => year <= toYear - 10).at(-1) ?? rangeYears[0];
  return { fromYear, toYear };
}

export function filterTrendRange(points: readonly TrendPoint[], range: TrendRange | null): TrendPoint[] {
  if (!range) return [];
  return points.filter((point) => point.year >= range.fromYear && point.year <= range.toYear);
}

export function changeOverPeriod(points: readonly TrendPoint[]): { percent: number; sinceYear: number } | null {
  const valid = points.filter((point): point is TrendPoint & { value: number } => point.value !== null);
  if (valid.length < 2 || valid[0].value === 0) return null;
  const first = valid[0];
  const latest = valid[valid.length - 1];
  return { percent: ((latest.value - first.value) / Math.abs(first.value)) * 100, sinceYear: first.year };
}

export function metricRank(
  observations: readonly Observation[], metricId: MetricId, year: number, regionId: string, direction: "higher" | "lower" = "higher",
): MetricRank | null {
  const values = new Map<string, number>();
  observations.forEach((observation) => {
    if (observation.metricId === metricId && observation.year === year) {
      const value = finiteValue(observation.value);
      if (value !== null) values.set(observation.regionId, value);
    }
  });
  if (!values.has(regionId)) return null;
  const ranked = [...values].sort(([firstId, firstValue], [secondId, secondValue]) =>
    (direction === "higher" ? secondValue - firstValue : firstValue - secondValue) || firstId.localeCompare(secondId));
  return { position: ranked.findIndex(([id]) => id === regionId) + 1, total: ranked.length };
}
