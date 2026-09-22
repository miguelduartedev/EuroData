import { useQuery } from "@tanstack/react-query";
import type { MetricId } from "../../types/metric";
import { EUROSTAT_SNAPSHOT_YEAR, getMetricHistory, getNuts2MetricSnapshot, getNuts2MetricYears } from "./metrics";

export function useNuts2MetricSnapshot(metricId: MetricId, year = EUROSTAT_SNAPSHOT_YEAR) {
  return useQuery({
    queryKey: ["eurostat", "nuts2", metricId, year],
    queryFn: () => getNuts2MetricSnapshot(metricId, year),
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

export function useRegionMetricHistory(regionId: string | undefined, metricId: MetricId) {
  return useQuery({
    queryKey: ["eurostat", "history", metricId, regionId],
    queryFn: () => getMetricHistory([regionId!], metricId),
    enabled: regionId !== undefined,
    staleTime: 60 * 60 * 1000,
  });
}
