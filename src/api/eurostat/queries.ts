import { useQuery } from "@tanstack/react-query";
import type { MetricId } from "../../types/metric";
import { EUROSTAT_SNAPSHOT_YEAR, getMetricHistory, getNuts2MetricSnapshot, getNuts2MetricYears } from "./metrics";

export function useNuts2MetricSnapshot(metricId: MetricId, year: number | null = EUROSTAT_SNAPSHOT_YEAR) {
  return useQuery({
    queryKey: ["eurostat", "nuts2", metricId, year ?? "unresolved-year"],
    queryFn: () => getNuts2MetricSnapshot(metricId, year ?? EUROSTAT_SNAPSHOT_YEAR),
    enabled: year !== null,
    staleTime: 60 * 60 * 1000,
  });
}

export function useNuts2MetricYears(metricId: MetricId) {
  return useQuery({
    queryKey: ["eurostat", "nuts2", "years", metricId],
    queryFn: () => getNuts2MetricYears(metricId),
    staleTime: 60 * 60 * 1000,
  });
}

export function useRegionMetricHistory(regionIds: readonly string[], metricId: MetricId) {
  const normalizedRegionIds = [...new Set(regionIds)].sort();
  return useQuery({
    queryKey: ["eurostat", "history", metricId, ...normalizedRegionIds],
    queryFn: () => getMetricHistory(normalizedRegionIds, metricId),
    enabled: normalizedRegionIds.length > 0,
    staleTime: 60 * 60 * 1000,
  });
}
