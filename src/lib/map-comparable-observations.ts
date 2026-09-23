import type { MetricId, Observation } from "../types/metric";
import { buildMetricLookup } from "./choropleth";

/** Numeric metric values whose NUTS IDs have selectable GISCO NUTS 2 polygons. */
export function buildMapComparableMetricLookup(
  observations: readonly Observation[],
  metricId: MetricId,
  year: number,
  selectableRegionIds: ReadonlySet<string>,
): ReadonlyMap<string, number | null> {
  return new Map(
    [...buildMetricLookup(observations, metricId, year)]
      .filter(([regionId]) => selectableRegionIds.has(regionId)),
  );
}
