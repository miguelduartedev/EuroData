import { useQuery } from "@tanstack/react-query";
import type { MetricId } from "../../types/metric";
import { EUROSTAT_SNAPSHOT_YEAR, getNuts2MetricSnapshot } from "./metrics";

export function useNuts2MetricSnapshot(metricId: MetricId, year = EUROSTAT_SNAPSHOT_YEAR) {
  return useQuery({
    queryKey: ["eurostat", "nuts2", metricId, year],
    queryFn: () => getNuts2MetricSnapshot(metricId, year),
    staleTime: 60 * 60 * 1000,
  });
}
