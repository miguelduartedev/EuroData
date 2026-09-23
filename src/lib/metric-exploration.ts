import type { MetricId, Observation } from "../types/metric";
import { choroplethBand, choroplethLegend, type ChoroplethScale } from "./choropleth";
import { buildMapComparableMetricLookup } from "./map-comparable-observations";

export interface MetricDistributionBand {
  index: number;
  label: string;
  color: string;
  count: number;
}

export interface MapComparableRegionValue {
  regionId: string;
  value: number;
}

/** Numeric observations backed by a selectable GISCO NUTS 2 polygon. */
export function mapComparableRegionValues(
  observations: readonly Observation[],
  metricId: MetricId,
  year: number,
  selectableRegionIds: ReadonlySet<string>,
): MapComparableRegionValue[] {
  return [...buildMapComparableMetricLookup(observations, metricId, year, selectableRegionIds)]
    .flatMap(([regionId, value]) => value === null ? [] : [{ regionId, value }]);
}

export function metricDistribution(
  values: readonly MapComparableRegionValue[],
  scale: ChoroplethScale,
  valueFormat: "number" | "euro" | "percent",
): MetricDistributionBand[] {
  const bands = choroplethLegend(scale, valueFormat).map((entry, index) => ({ ...entry, index, count: 0 }));
  values.forEach(({ value }) => {
    const band = choroplethBand(value, scale);
    if (band !== null) bands[band].count += 1;
  });
  return bands;
}

export function exploreRegions(
  values: readonly MapComparableRegionValue[],
  order: "highest" | "lowest",
  limit = 5,
): MapComparableRegionValue[] {
  return [...values]
    .sort((first, second) => {
      const byValue = order === "highest" ? second.value - first.value : first.value - second.value;
      return byValue || first.regionId.localeCompare(second.regionId);
    })
    .slice(0, limit);
}
