import type { MetricDefinition } from "../types/metric";

const exact = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1, notation: "compact" });

export function formatMetricValue(value: number, metric: Pick<MetricDefinition, "valueFormat">, abbreviated = false): string {
  const formatted = (abbreviated ? compact : exact).format(value);
  if (metric.valueFormat === "euro") return `€${formatted}`;
  if (metric.valueFormat === "percent") return `${formatted}%`;
  return formatted;
}

export function formatMetricPeriodChange(value: number, metric: Pick<MetricDefinition, "periodChange">): string {
  return `${value >= 0 ? "+" : ""}${exact.format(value)}${metric.periodChange === "percentagePoints" ? " pp" : "%"}`;
}

export function formatMetricDifference(value: number, metric: Pick<MetricDefinition, "valueFormat" | "unit">): string {
  if (metric.valueFormat === "percent") return `${value >= 0 ? "+" : ""}${exact.format(value)} pp`;
  return `${formatMetricValue(Math.abs(value), metric)} ${metric.valueFormat === "euro" ? "per inhabitant" : metric.unit}`;
}
