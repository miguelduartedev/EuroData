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

/** All source NUTS 2 categories for one year, including missing observations. */
export async function getNuts2MetricSnapshot(
  metricId: MetricId,
  year = EUROSTAT_SNAPSHOT_YEAR,
): Promise<Observation[]> {
  const metric = getMetricDefinition(metricId);
  const dataset = await getEurostatDataset(metric.eurostat.datasetId, {
    ...metric.eurostat.filters,
    geoLevel: "nuts2",
    time: String(year),
  });

  return parseMetricObservations(dataset, { metricId, unit: metric.unit });
}

export async function getNuts2MetricYears(metricId: MetricId): Promise<number[]> {
  const metric = getMetricDefinition(metricId);
  const dataset = await getEurostatDataset(metric.eurostat.datasetId, {
    ...metric.eurostat.filters,
    geoLevel: "nuts2",
  });

  const observations = parseMetricObservations(dataset, { metricId, unit: metric.unit });
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

  const metric = getMetricDefinition(metricId);
  const dataset = await getEurostatDataset(metric.eurostat.datasetId, {
    ...metric.eurostat.filters,
    geo: geographies,
  });

  return parseMetricObservations(dataset, { metricId, unit: metric.unit });
}

export async function getRegionMetrics(regionIds: string[]): Promise<Observation[]> {
  const result = await Promise.all(
    (Object.keys(eurostatMetrics) as MetricId[]).map((metricId) => getMetricHistory(regionIds, metricId)),
  );

  return result.flat().sort((first, second) =>
    first.regionId.localeCompare(second.regionId) ||
    first.metricId.localeCompare(second.metricId) ||
    first.year - second.year,
  );
}
