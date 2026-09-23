import { BarChart3Icon } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { MetricDistributionBand } from "@/lib/metric-exploration";
import type { MetricDefinition } from "@/types/metric";

interface RegionalDistributionProps {
  metric: MetricDefinition;
  year: number;
  bands: readonly MetricDistributionBand[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
}

export function RegionalDistribution({ metric, year, bands, total, isLoading, isError, hasData }: RegionalDistributionProps) {
  const loading = isLoading && !hasData;
  const unavailable = isError && !hasData;
  const max = Math.max(...bands.map(({ count }) => count), 0);
  const width = 640;
  const height = 210;
  const left = 34;
  const right = 12;
  const top = 14;
  const bottom = 42;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const step = chartWidth / Math.max(bands.length, 1);
  const barWidth = Math.min(52, step * 0.7);
  const y = (count: number) => max === 0 ? top + chartHeight : top + (max - count) * chartHeight / max;
  const ticks = max === 0 ? [] : [...new Set([max, Math.ceil(max / 2), 0])];

  return <Card aria-busy={loading} className="gap-0 rounded-lg border border-border py-0 shadow-none ring-0">
    <div className="flex items-start gap-3 border-b border-border p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
        <BarChart3Icon aria-hidden="true" className="size-5" strokeWidth={1.5} />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">Regional distribution</h2>
        <p className="mt-1 text-xs text-muted-foreground">{metric.label} · {year}</p>
      </div>
    </div>
    <div className="p-4">
      {loading ? <div aria-label="Loading regional distribution" className="aspect-[640/210] w-full animate-pulse rounded bg-muted motion-reduce:animate-none" /> :
        total > 0 ? <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={`Regional distribution for ${metric.label} in ${year}`}>
          {ticks.map((tick) => <g key={tick}>
            <line x1={left} y1={y(tick)} x2={width - right} y2={y(tick)} className="stroke-border/60" strokeDasharray="2 3" />
            <text x={left - 6} y={y(tick) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{tick}</text>
          </g>)}
          <line x1={left} y1={top} x2={left} y2={height - bottom} className="stroke-border" />
          <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} className="stroke-border" />
          <text x={left} y={top - 4} textAnchor="start" className="fill-muted-foreground text-[10px]">Regions</text>
          {bands.map((band, index) => {
            const x = left + index * step + (step - barWidth) / 2;
            const barY = y(band.count);
            const barHeight = height - bottom - barY;
            return <g key={band.label}>
              <rect x={x} y={barY} width={barWidth} height={barHeight} rx="2" fill={band.color} aria-label={`${band.label}: ${band.count} regions`}>
                <title>{`${band.label}: ${band.count} regions`}</title>
              </rect>
              <text x={x + barWidth / 2} y={height - bottom + 14} textAnchor="middle" className="fill-muted-foreground text-[9px]">{band.label}</text>
              <text x={x + barWidth / 2} y={barY - 5} textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium">{band.count}</text>
            </g>;
          })}
        </svg> : <p className="flex aspect-[640/210] w-full items-center justify-center rounded bg-muted/50 text-xs text-muted-foreground">{unavailable ? "Metric data is currently unavailable." : "No data available"}</p>}
      {!loading && total > 0 ? <p className="mt-3 text-xs text-muted-foreground">{total} {total === 1 ? "region" : "regions"} with data</p> : null}
      {isError && hasData ? <p role="status" className="mt-3 text-xs text-muted-foreground">Could not refresh data. Showing the last available snapshot.</p> : null}
    </div>
  </Card>;
}
