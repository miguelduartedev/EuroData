import type { MetricId, Observation } from "../../types/metric";
import { getEurostatDataset } from "./client";
import { parseAnnualTimePeriods, parseMetricObservations } from "./parser";
import type { MetricConfiguration } from "./types";

export const EUROSTAT_START_YEAR = 2015;
export const EUROSTAT_SNAPSHOT_YEAR = 2023;

export const eurostatMetrics: Record<MetricId, MetricConfiguration> = {
  gdp_per_capita: {
    datasetId: "nama_10r_2gdp",
    filters: { freq: "A", unit: "PPS_EU27_2020_HAB" },
    unit: "PPS per inhabitant",
  },
  unemployment_rate: {
    datasetId: "lfst_r_lfu3rt",
    filters: { freq: "A", isced11: "TOTAL", sex: "T", age: "Y15-74", unit: "PC" },
    unit: "% of labour force",
  },
  gdp_growth: {
    datasetId: "nama_10r_2gvagr",
    filters: { freq: "A", na_item: "B1GQ", unit: "PCH_PRE" },
    unit: "% change on previous year",
  },
};

function uniqueRegionIds(regionIds: string[]): string[] {
  return [...new Set(regionIds)];
}

/** All source NUTS 2 categories for one year, including missing observations. */
export async function getNuts2MetricSnapshot(
  metricId: MetricId,
  year = EUROSTAT_SNAPSHOT_YEAR,
): Promise<Observation[]> {
  const metric = eurostatMetrics[metricId];
  const dataset = await getEurostatDataset(metric.datasetId, {
    ...metric.filters,
    geoLevel: "nuts2",
    time: String(year),
  });

  return parseMetricObservations(dataset, { metricId, unit: metric.unit });
}

export async function getNuts2MetricYears(metricId: MetricId): Promise<number[]> {
  const metric = eurostatMetrics[metricId];
  const dataset = await getEurostatDataset(metric.datasetId, {
    ...metric.filters,
    geoLevel: "nuts2",
  });

  return parseAnnualTimePeriods(dataset);
}

export async function getMetricHistory(regionIds: string[], metricId: MetricId): Promise<Observation[]> {
  const geographies = uniqueRegionIds(regionIds);
  if (geographies.length === 0) {
    return [];
  }

  const metric = eurostatMetrics[metricId];
  const dataset = await getEurostatDataset(metric.datasetId, {
    ...metric.filters,
    geo: geographies,
    sinceTimePeriod: String(EUROSTAT_START_YEAR),
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
