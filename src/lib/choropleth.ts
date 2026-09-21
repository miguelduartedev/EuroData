import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import type { ExpressionSpecification } from "maplibre-gl";
import type { MetricId, Observation } from "../types/metric";

export interface ChoroplethScale {
  thresholds: readonly number[];
  /** One more colour than thresholds, ordered from lowest to highest. */
  colors: readonly string[];
}

export interface MapMetric {
  values: ReadonlyMap<string, number | null>;
  label: string;
  unit: string;
  year: number;
  scale: ChoroplethScale;
  isLoading: boolean;
  isError: boolean;
}

export const METRIC_VALUE_PROPERTY = "metricValue";
export const NO_DATA_COLORS = { light: "#cbd5e1", dark: "#475569" } as const;
const numberFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

export function finiteValue(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function buildMetricLookup(
  observations: readonly Observation[], metricId: MetricId, year: number,
): ReadonlyMap<string, number | null> {
  return new Map(observations
    .filter((observation) => observation.metricId === metricId && observation.year === year)
    .map(({ regionId, value }) => [regionId, finiteValue(value)]));
}

export function joinMetricToGeometry<G extends Geometry>(
  collection: FeatureCollection<G, GeoJsonProperties>, values: ReadonlyMap<string, number | null>,
): FeatureCollection<G, GeoJsonProperties> {
  return {
    ...collection,
    features: collection.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        [METRIC_VALUE_PROPERTY]: finiteValue(values.get(feature.properties?.NUTS_ID)),
      },
    })),
  };
}

export function choroplethBand(value: number | null | undefined, scale: ChoroplethScale): number | null {
  if (finiteValue(value) === null) return null;
  const band = scale.thresholds.findIndex((threshold) => value! < threshold);
  return band === -1 ? scale.thresholds.length : band;
}

export function choroplethLegend(scale: ChoroplethScale): Array<{ label: string; color: string }> {
  return scale.colors.map((color, index) => ({
    color,
    label: index === 0 ? `<${numberFormat.format(scale.thresholds[0])}`
      : index === scale.thresholds.length ? `≥${numberFormat.format(scale.thresholds[index - 1])}`
        : `${numberFormat.format(scale.thresholds[index - 1])}–<${numberFormat.format(scale.thresholds[index])}`,
  }));
}

export function choroplethExpression(scale: ChoroplethScale, noDataColor: string): ExpressionSpecification {
  return [
    "case", ["==", ["get", METRIC_VALUE_PROPERTY], null], noDataColor,
    ["step", ["number", ["get", METRIC_VALUE_PROPERTY]], scale.colors[0],
      ...scale.thresholds.flatMap((threshold, index) => [threshold, scale.colors[index + 1]])],
  ] as ExpressionSpecification;
}

export function metricHoverText(properties: GeoJsonProperties, metric: MapMetric): string[] {
  const id = properties?.NUTS_ID as string;
  const name = properties?.NAME_LATN || properties?.NUTS_NAME || id;
  const value = finiteValue(metric.values.get(id));
  return [
    name === id ? id : `${name} (${id})`,
    value === null ? (metric.isLoading ? "Loading data…" : "No data") : numberFormat.format(value),
    `${metric.unit} · ${metric.year}`,
  ];
}
