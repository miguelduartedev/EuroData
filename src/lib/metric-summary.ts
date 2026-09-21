import type { MetricId, Observation } from "../types/metric";
import { buildMetricLookup } from "./choropleth";

export interface RegionValue {
  regionId: string;
  value: number;
}

export interface MetricSummary {
  average: number | null;
  highest: RegionValue | null;
  lowest: RegionValue | null;
  count: number;
}

export function summarizeMetric(
  observations: readonly Observation[], metricId: MetricId, year: number,
): MetricSummary {
  const values = [...buildMetricLookup(observations, metricId, year)]
    .filter((entry): entry is [string, number] => entry[1] !== null)
    .map(([regionId, value]) => ({ regionId, value }))
    .sort((a, b) => a.regionId.localeCompare(b.regionId));
  let highest: RegionValue | null = null;
  let lowest: RegionValue | null = null;
  for (const observation of values) {
    if (!highest || observation.value > highest.value) highest = observation;
    if (!lowest || observation.value < lowest.value) lowest = observation;
  }
  return {
    average: values.length ? values.reduce((sum, item) => sum + item.value / values.length, 0) : null,
    highest,
    lowest,
    count: values.length,
  };
}
