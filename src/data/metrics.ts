import type { MetricDefinition } from "../types/metric";

export const metrics: MetricDefinition[] = [
  { id: "gdp_per_capita", label: "GDP per capita", unit: "PPS per inhabitant", description: "Gross domestic product per inhabitant in purchasing power standards." },
  { id: "unemployment_rate", label: "Unemployment rate", unit: "% of labour force", description: "Share of the active labour force without work." },
  { id: "gdp_growth", label: "Real GDP growth", unit: "% change on previous year", description: "Annual percentage change in regional GDP volume." },
];
