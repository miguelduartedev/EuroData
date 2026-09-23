import { useId, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { CountryFlag } from "@/components/CountryFlag/CountryFlag";
import type { RegionMetadata } from "@/data/region-names";
import type { MetricDefinition } from "@/types/metric";
import { finiteValue } from "@/lib/choropleth";
import { formatMetricPeriodChange, formatMetricValue } from "@/lib/metric-format";
import {
  changeOverPeriod,
  filterTrendRange,
  selectableTrendYears,
  type MetricRank,
  type TrendPoint,
} from "@/lib/metric-trend";
import { TrendChart } from "./TrendChart";
import { useTrendRange } from "./useTrendRange";

interface SelectedRegionDetailsProps {
  region: RegionMetadata;
  metric: MetricDefinition;
  year: number;
  value: number | null;
  color: string;
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
  trend: readonly TrendPoint[];
  rank: MetricRank | null;
  isHistoryLoading: boolean;
  isHistoryError: boolean;
  hasHistoryData: boolean;
}

export function SelectedRegionDetails({
  region, metric, year, value, color, isLoading, isError, hasData,
  trend, rank, isHistoryLoading, isHistoryError, hasHistoryData,
}: SelectedRegionDetailsProps) {
  const headingId = useId();
  const loading = isLoading && !hasData;
  const unavailable = isError && !hasData;
  const numericValue = finiteValue(value);
  const availableTrendYears = useMemo(() => selectableTrendYears(trend), [trend]);
  const { range, setFromYear, setToYear } = useTrendRange(availableTrendYears, year, `${region.id}:${metric.id}`);
  const filteredTrend = useMemo(() => filterTrendRange(trend, range), [trend, range]);
  const change = useMemo(() => changeOverPeriod(filteredTrend, metric.periodChange), [filteredTrend, metric.periodChange]);

  return (
    <Card role="region" aria-labelledby={headingId} aria-busy={loading} className="gap-0 rounded-lg border border-border py-0 shadow-none ring-0">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
          <CountryFlag countryCode={region.countryCode} countryName={region.countryName} className="size-full rounded-full object-cover" />
        </span>
        <div className="min-w-0">
          <h2 id={headingId} className="break-words text-lg font-semibold leading-tight tracking-tight">{region.name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{region.countryName ? `${region.countryName} · ` : ""}{region.id}</p>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm font-medium">{metric.label}</p>
        <div className="mt-2 min-h-9">
          {loading ? <span aria-label="Loading selected region value" className="block h-9 w-28 animate-pulse rounded bg-muted motion-reduce:animate-none" /> :
            <p className="text-3xl font-semibold tracking-tight tabular-nums">{unavailable ? "—" : numericValue === null ? "No data" : formatMetricValue(numericValue, metric)}</p>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{metric.unit} · {year}</p>
        {(change || rank) ? <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
          {change ? <div>
            <dt className="text-xs text-muted-foreground">Change over period</dt>
            <dd className={`mt-1 text-sm font-semibold tabular-nums ${change.value === 0 ? "" : (change.value > 0) === (metric.rankDirection === "higher") ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {formatMetricPeriodChange(change.value, metric)}
            </dd>
            <p className="text-xs text-muted-foreground">since {change.sinceYear}</p>
          </div> : null}
          {rank ? <div className={change ? "border-l border-border pl-3" : ""}>
            <dt className="text-xs text-muted-foreground">Regional rank</dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums">{rank.position} / {rank.total}</dd>
            <p className="text-xs text-muted-foreground">current snapshot</p>
          </div> : null}
        </dl> : null}
        {isError && <p role="status" className="mt-2 text-xs text-muted-foreground">{hasData ? "Could not refresh data. Showing the last available snapshot." : "Metric data is currently unavailable."}</p>}
      </div>
      <TrendChart
        metric={metric}
        regionId={region.id}
        regionName={region.name}
        color={color}
        points={filteredTrend}
        availableYears={availableTrendYears}
        fromYear={range?.fromYear}
        toYear={range?.toYear}
        onFromYearChange={setFromYear}
        onToYearChange={setToYear}
        isLoading={isHistoryLoading}
        isError={isHistoryError}
        hasData={hasHistoryData}
      />
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">Select another region to compare</p>
    </Card>
  );
}
