import type { MetricId, Observation } from "../../types/metric";
import { getMetricDefinition, metricRegistry } from "../../data/metrics";
import { getEurostatDataset } from "./client";
import { parseMetricObservations } from "./parser";
import type { MetricConfiguration } from "./types";

export const EUROSTAT_SNAPSHOT_YEAR = 2023;

/** Compatibility view for callers inspecting API settings; definitions live in the metric registry. */
export const eurostatMetrics: Record<MetricId, MetricConfiguration> = Object.fromEntries(
  (Object.keys(metricRegistry) as MetricId[]).map((id) => {
    const metric = getMetricDefinition(id);
    return [id, { ...metric.eurostat, unit: metric.unit }];
  }),
) as Record<MetricId, MetricConfiguration>;

function uniqueRegionIds(regionIds: string[]): string[] {
  return [...new Set(regionIds)];
}

function sourceUnit(metricId: MetricId): string {
  const metric = getMetricDefinition(metricId);
  return metric.sourceUnit ?? metric.unit;
}

/**
 * Converts a level series into annual percentage changes while retaining the
 * normalized Observation shape. A value requires the exact preceding calendar
 * year; gaps, nulls, non-finite values and a zero denominator remain no data.
 */
export function deriveAnnualPercentChanges(
  observations: readonly Observation[],
  metricId: MetricId = "population_growth",
  unit = "% change on previous year",
): Observation[] {
  const byRegion = new Map<string, Map<number, Observation>>();
  observations.forEach((observation) => {
    const years = byRegion.get(observation.regionId) ?? new Map<number, Observation>();
    years.set(observation.year, observation);
    byRegion.set(observation.regionId, years);
  });

  return [...byRegion.entries()].flatMap(([regionId, years]) =>
    [...years.values()].map((current): Observation => {
      const previous = years.get(current.year - 1);
      const currentValue = current.value;
      const previousValue = previous?.value;
      const valid = typeof currentValue === "number" && Number.isFinite(currentValue) &&
        typeof previousValue === "number" && Number.isFinite(previousValue) && previousValue !== 0;
      return {
        regionId,
        metricId,
        year: current.year,
        value: valid ? ((currentValue - previousValue) / previousValue) * 100 : null,
        unit,
        ...(current.status ? { status: current.status } : {}),
      };
    }),
  ).sort((first, second) =>
    first.regionId.localeCompare(second.regionId) || first.year - second.year,
  );
}

function normalizeMetricSource(observations: readonly Observation[], metricId: MetricId): Observation[] {
  const metric = getMetricDefinition(metricId);
  if (metric.derivation === "annualPercentChange") {
    return deriveAnnualPercentChanges(observations, metricId, metric.unit);
  }
  return observations.map((observation) => ({ ...observation, metricId, unit: metric.unit }));
}

async function fetchMetricSource(
  metricId: MetricId,
  filters: Record<string, string | readonly string[]>,
): Promise<Observation[]> {
  const metric = getMetricDefinition(metricId);
  const dataset = await getEurostatDataset(metric.eurostat.datasetId, {
    ...metric.eurostat.filters,
    ...filters,
  });
  return parseMetricObservations(dataset, { metricId, unit: sourceUnit(metricId) });
}

/** All source NUTS 2 categories for one year, including missing observations. */
export async function getNuts2MetricSnapshot(
  metricId: MetricId,
  year = EUROSTAT_SNAPSHOT_YEAR,
): Promise<Observation[]> {
  const metric = getMetricDefinition(metricId);
  const source = await fetchMetricSource(metricId, {
    geoLevel: "nuts2",
    time: metric.derivation === "annualPercentChange"
      ? [String(year - 1), String(year)]
      : String(year),
  });
  return normalizeMetricSource(source, metricId).filter((observation) => observation.year === year);
}

export async function getNuts2MetricYears(metricId: MetricId): Promise<number[]> {
  const source = await fetchMetricSource(metricId, { geoLevel: "nuts2" });
  const observations = normalizeMetricSource(source, metricId);
  return [...new Set(
    observations
      .filter(({ value }) => typeof value === "number" && Number.isFinite(value))
      .map(({ year }) => year),
  )].sort((first, second) => second - first);
}

export async function getMetricHistory(regionIds: string[], metricId: MetricId): Promise<Observation[]> {
  const geographies = uniqueRegionIds(regionIds);
  if (geographies.length === 0) {
    return [];
  }

  const source = await fetchMetricSource(metricId, { geo: geographies });
  return normalizeMetricSource(source, metricId);
}

export async function getRegionMetrics(regionIds: string[]): Promise<Observation[]> {
  const metricIds = Object.keys(eurostatMetrics) as MetricId[];
  const sourceMetricIds = metricIds.filter((metricId) => !getMetricDefinition(metricId).sourceMetricId);
  const sourceResults = await Promise.all(
    sourceMetricIds.map(async (metricId) => [metricId, await getMetricHistory(regionIds, metricId)] as const),
  );
  const observationsByMetric = new Map<MetricId, Observation[]>(sourceResults);
  metricIds.forEach((metricId) => {
    const metric = getMetricDefinition(metricId);
    if (!metric.sourceMetricId) return;
    const source = observationsByMetric.get(metric.sourceMetricId) ?? [];
    observationsByMetric.set(metricId, normalizeMetricSource(source, metricId));
  });
  const result = metricIds.map((metricId) => observationsByMetric.get(metricId) ?? []);

  return result.flat().sort((first, second) =>
    first.regionId.localeCompare(second.regionId) ||
    first.metricId.localeCompare(second.metricId) ||
    first.year - second.year,
  );
}
