import type { metricRegistry } from "../data/metrics";
import type { ChoroplethScale } from "../lib/choropleth";

export type MetricId = keyof typeof metricRegistry;

export interface MetricDefinition {
  id: MetricId;
  label: string;
  description: string;
  category: "Economy" | "Labour" | "Demographics";
  eurostat: { datasetId: string; filters: Record<string, string> };
  derivation?: "annualPercentChange";
  sourceMetricId?: MetricId;
  sourceUnit?: string;
  unit: string;
  valueFormat: "number" | "euro" | "percent";
  rankDirection: "higher" | "lower";
  periodChange: "relative" | "percentagePoints";
  choropleth: ChoroplethScale;
}

export interface Observation {
  regionId: string;
  metricId: MetricId;
  year: number;
  value: number | null;
  unit: string;
  /** Opaque Eurostat observation flag, when supplied by the source dataset. */
  status?: string;
}
