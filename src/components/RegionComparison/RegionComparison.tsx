import { useMemo } from "react";
import { CountryFlag } from "@/components/CountryFlag/CountryFlag";
import type { RegionMetadata } from "@/data/region-names";
import { finiteValue } from "@/lib/choropleth";
import {
  changeOverPeriod,
  filterTrendRange,
  metricDifference,
  sharedSelectableTrendYears,
  type MetricRank,
  type TrendPoint,
} from "@/lib/metric-trend";
import type { MetricDefinition } from "@/types/metric";
import { formatMetricDifference, formatMetricPeriodChange, formatMetricValue } from "@/lib/metric-format";
import { useTrendRange } from "@/components/SelectedRegionDetails/useTrendRange";
import { ComparisonTrendChart } from "./ComparisonTrendChart";

export interface ComparisonRegionData {
  slot: "Region A" | "Region B";
  metadata: RegionMetadata;
  color: string;
  value: number | null;
  rank: MetricRank | null;
  trend: readonly TrendPoint[];
}

interface RegionComparisonProps {
  metric: MetricDefinition;
  year: number;
  regions: readonly [ComparisonRegionData, ComparisonRegionData];
  isSnapshotLoading: boolean;
  isSnapshotError: boolean;
  hasSnapshotData: boolean;
  isHistoryLoading: boolean;
  isHistoryError: boolean;
  hasHistoryData: boolean;
  onClear: () => void;
}

const numberFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const signed = (value: number) => `${value >= 0 ? "+" : ""}${numberFormat.format(value)}`;

function ComparisonRegionCard({ region, metric, year, change, loading }: {
  region: ComparisonRegionData;
  metric: MetricDefinition;
  year: number;
  change: ReturnType<typeof changeOverPeriod>;
  loading: boolean;
}) {
  const value = finiteValue(region.value);
  return <article aria-label={`${region.slot}: ${region.metadata.name}`} className="rounded-lg border border-t-4 border-border bg-card p-4" style={{ borderTopColor: region.color }}>
    <div className="flex min-w-0 items-center gap-3">
      <span className="size-11 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
        <CountryFlag countryCode={region.metadata.countryCode} countryName={region.metadata.countryName} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{region.slot}</p>
        <h3 className="truncate text-base font-semibold">{region.metadata.name}</h3>
        <p className="truncate text-xs text-muted-foreground">{region.metadata.countryName ? `${region.metadata.countryName} · ` : ""}{region.metadata.id}</p>
      </div>
    </div>
    <div className="mt-4 border-t border-border pt-3">
      <p className="text-xs text-muted-foreground">{metric.label}</p>
      {loading ? <span aria-label={`Loading ${region.metadata.name} value`} className="mt-1 block h-7 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" /> :
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value === null ? "No data" : formatMetricValue(value, metric)}</p>}
      <p className="mt-0.5 text-xs text-muted-foreground">{metric.unit} · {year}</p>
    </div>
    <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
      <div>
        <dt className="text-xs text-muted-foreground">Regional rank</dt>
        <dd className="mt-1 text-sm font-semibold tabular-nums">{region.rank ? `${region.rank.position} / ${region.rank.total}` : "No data"}</dd>
      </div>
      <div className="border-l border-border pl-3">
        <dt className="text-xs text-muted-foreground">Period change</dt>
        <dd className="mt-1 text-sm font-semibold tabular-nums">{change ? formatMetricPeriodChange(change.value, metric) : "No data"}</dd>
        {change ? <p className="text-xs text-muted-foreground">since {change.sinceYear}</p> : null}
      </div>
    </dl>
  </article>;
}

export function RegionComparison({
  metric, year, regions, isSnapshotLoading, isSnapshotError, hasSnapshotData,
  isHistoryLoading, isHistoryError, hasHistoryData, onClear,
}: RegionComparisonProps) {
  const availableYears = useMemo(() => sharedSelectableTrendYears(regions[0].trend, regions[1].trend), [regions]);
  const resetKey = `${regions[0].metadata.id}:${regions[1].metadata.id}:${metric.id}`;
  const { range, setFromYear, setToYear } = useTrendRange(availableYears, year, resetKey);
  const filteredTrends = useMemo(() => [
    filterTrendRange(regions[0].trend, range),
    filterTrendRange(regions[1].trend, range),
  ] as const, [range, regions]);
  const changes = useMemo(() => filteredTrends.map((trend) => changeOverPeriod(trend, metric.periodChange)), [filteredTrends, metric.periodChange]);
  const difference = metricDifference(regions[0].value, regions[1].value);
  const snapshotLoading = isSnapshotLoading && !hasSnapshotData;

  return <section aria-label="Region comparison" className="grid gap-4">
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Comparing 2 regions</h2>
          <p className="text-xs text-muted-foreground">{metric.label} · {year}</p>
        </div>
        <button type="button" onClick={onClear} className="cursor-pointer rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Clear comparison</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ComparisonRegionCard region={regions[0]} metric={metric} year={year} change={changes[0]} loading={snapshotLoading} />
        <ComparisonRegionCard region={regions[1]} metric={metric} year={year} change={changes[1]} loading={snapshotLoading} />
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2 rounded-md bg-muted/50 px-3 py-2.5">
        <div>
          <p className="text-xs text-muted-foreground">Difference</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">{difference ? formatMetricDifference(difference.value, metric) : "No data"}</p>
        </div>
        {metric.periodChange === "relative" ? <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">{difference?.percent === null || difference === null ? "—" : `${signed(difference.percent)}%`}</p>
          <p className="text-[10px] text-muted-foreground">{regions[0].metadata.name} relative to {regions[1].metadata.name}</p>
        </div> : null}
      </div>
      {isSnapshotError ? <p role="status" className="mt-2 text-xs text-muted-foreground">{hasSnapshotData ? "Could not refresh data. Showing the last available snapshot." : "Metric data is currently unavailable."}</p> : null}
    </div>
    <ComparisonTrendChart
      metric={metric}
      series={[
        { id: regions[0].metadata.id, name: regions[0].metadata.name, color: regions[0].color, points: filteredTrends[0] },
        { id: regions[1].metadata.id, name: regions[1].metadata.name, color: regions[1].color, points: filteredTrends[1] },
      ]}
      availableYears={availableYears}
      fromYear={range?.fromYear}
      toYear={range?.toYear}
      onFromYearChange={setFromYear}
      onToYearChange={setToYear}
      isLoading={isHistoryLoading}
      isError={isHistoryError}
      hasData={hasHistoryData}
    />
  </section>;
}
