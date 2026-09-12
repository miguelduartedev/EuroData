export type MetricId =
  | "gdp_per_capita"
  | "unemployment_rate"
  | "gdp_growth";

export interface MetricDefinition {
  id: MetricId;
  label: string;
  unit: string;
  description: string;
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
