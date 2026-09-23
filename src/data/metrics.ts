import type { ChoroplethScale } from "../lib/choropleth";
import type { MetricDefinition, MetricId } from "../types/metric";

interface MetricConfiguration {
  label: string;
  description: string;
  category: "Economy" | "Labour";
  eurostat: { datasetId: string; filters: Record<string, string> };
  unit: string;
  valueFormat: "number" | "euro" | "percent";
  rankDirection: "higher" | "lower";
  periodChange: "relative" | "percentagePoints";
  choropleth: ChoroplethScale;
}

/** Eurostat-style bands, ordered from low orange to high blue. */
export const EUROSTAT_ORANGE_BLUE_6 = [
  "#D96D24",
  "#F0B956",
  "#C8D8EC",
  "#809BC9",
  "#5878B5",
  "#3559A0",
] as const;

const EUROSTAT_BLUE_TO_ORANGE_6: readonly string[] = [...EUROSTAT_ORANGE_BLUE_6].reverse();

/** Keeps growth's existing seven threshold bands while using the shared palette. */
const EUROSTAT_GROWTH_DIVERGING = [
  EUROSTAT_ORANGE_BLUE_6[0],
  EUROSTAT_ORANGE_BLUE_6[1],
  EUROSTAT_ORANGE_BLUE_6[2],
  EUROSTAT_ORANGE_BLUE_6[2],
  EUROSTAT_ORANGE_BLUE_6[3],
  EUROSTAT_ORANGE_BLUE_6[4],
  EUROSTAT_ORANGE_BLUE_6[5],
] as const;

/** The only supported-metric list. API requests, controls and map styling resolve from here. */
export const metricRegistry = {
  gdp_per_capita: {
    label: "GDP per capita (PPS)",
    description: "Gross domestic product per inhabitant in purchasing power standards.",
    category: "Economy",
    eurostat: { datasetId: "nama_10r_2gdp", filters: { freq: "A", unit: "PPS_EU27_2020_HAB" } },
    unit: "PPS per inhabitant",
    valueFormat: "number",
    rankDirection: "higher",
    periodChange: "relative",
    choropleth: {
      thresholds: [20_000, 30_000, 40_000, 50_000, 70_000],
      colors: EUROSTAT_ORANGE_BLUE_6,
    },
  },
  gdp_per_capita_eur: {
    label: "GDP per capita (EUR)",
    description: "Gross domestic product per inhabitant in euros.",
    category: "Economy",
    eurostat: { datasetId: "nama_10r_2gdp", filters: { freq: "A", unit: "EUR_HAB" } },
    unit: "EUR per inhabitant",
    valueFormat: "euro",
    rankDirection: "higher",
    periodChange: "relative",
    choropleth: {
      thresholds: [15_000, 25_000, 35_000, 50_000, 70_000],
      colors: EUROSTAT_ORANGE_BLUE_6,
    },
  },
  gdp_growth: {
    label: "Real GDP growth",
    description: "Annual percentage change in regional GDP volume.",
    category: "Economy",
    eurostat: { datasetId: "nama_10r_2gvagr", filters: { freq: "A", na_item: "B1GQ", unit: "PCH_PRE" } },
    unit: "% change on previous year",
    valueFormat: "percent",
    rankDirection: "higher",
    periodChange: "percentagePoints",
    choropleth: {
      thresholds: [-5, -2, -0.5, 0.5, 2, 5],
      colors: EUROSTAT_GROWTH_DIVERGING,
    },
  },
  unemployment_rate: {
    label: "Unemployment rate",
    description: "Share of the active labour force without work.",
    category: "Labour",
    eurostat: { datasetId: "lfst_r_lfu3rt", filters: { freq: "A", isced11: "TOTAL", sex: "T", age: "Y15-74", unit: "PC" } },
    unit: "% of labour force",
    valueFormat: "percent",
    rankDirection: "lower",
    periodChange: "percentagePoints",
    choropleth: {
      thresholds: [3, 5, 7, 10, 15],
      colors: EUROSTAT_BLUE_TO_ORANGE_6,
    },
  },
} as const satisfies Record<string, MetricConfiguration>;

export const metrics = (Object.keys(metricRegistry) as MetricId[]).map((id): MetricDefinition => ({
  id,
  ...metricRegistry[id],
}));

export function getMetricDefinition(id: MetricId): MetricDefinition {
  return { id, ...metricRegistry[id] };
}
