import { useState } from "react";
import { TrendRangeControls } from "@/components/SelectedRegionDetails/TrendRangeControls";
import type { TrendPoint } from "@/lib/metric-trend";
import type { MetricDefinition } from "@/types/metric";
import { formatMetricValue } from "@/lib/metric-format";

export interface MetricTrendSeries {
  id: string;
  name: string;
  color: string;
  points: readonly TrendPoint[];
}

interface MetricTrendChartProps {
  metric: MetricDefinition;
  series: readonly MetricTrendSeries[];
  availableYears: readonly number[];
  fromYear: number | undefined;
  toYear: number | undefined;
  onFromYearChange: (year: number) => void;
  onToYearChange: (year: number) => void;
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
  variant: "embedded" | "card";
  sectionAriaLabel: string;
  chartAriaLabel: string;
  loadingAriaLabel: string;
  emptyMessage: string;
}

export function MetricTrendChart({
  metric, series, availableYears, fromYear, toYear, onFromYearChange, onToYearChange,
  isLoading, isError, hasData, variant, sectionAriaLabel, chartAriaLabel, loadingAriaLabel, emptyMessage,
}: MetricTrendChartProps) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const loading = isLoading && !hasData;
  const years = [...new Set(series.flatMap(({ points }) => points.map(({ year }) => year)))].sort((a, b) => a - b);
  const values = series.flatMap(({ points }) => points.flatMap(({ value }) => value === null ? [] : [value]));
  const valueMaps = series.map(({ points }) => new Map(points.map(({ year, value }) => [year, value])));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 640;
  const height = 220;
  const left = 52;
  const right = 14;
  const top = 16;
  const bottom = 28;
  const x = (index: number) => left + (years.length < 2 ? 0 : index * (width - left - right) / (years.length - 1));
  const y = (value: number) => top + (max === min ? (height - top - bottom) / 2 : (max - value) * (height - top - bottom) / (max - min));
  const yTicks = max === min ? [max] : [max, (min + max) / 2, min];
  const xTickIndexes = [...new Set([0, Math.floor((years.length - 1) / 2), years.length - 1])];
  const segments = valueMaps.map((valuesByYear) => {
    const paths: string[] = [];
    years.forEach((year, index) => {
      const value = valuesByYear.get(year);
      if (value === null || value === undefined) return;
      const previous = index > 0 ? valuesByYear.get(years[index - 1]) : null;
      if (previous === null || previous === undefined) paths.push(`M ${x(index)} ${y(value)}`);
      else paths[paths.length - 1] += ` L ${x(index)} ${y(value)}`;
    });
    return paths;
  });
  const sectionClassName = variant === "card"
    ? "rounded-lg border border-border bg-card p-4"
    : "border-t border-border px-4 py-4";

  return <section aria-label={sectionAriaLabel} className={sectionClassName}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold">{metric.label} trend</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {series.map((item) => <span key={item.id} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-5" style={{ backgroundColor: item.color }} />{item.name}
          </span>)}
        </div>
      </div>
      <TrendRangeControls
        availableYears={availableYears}
        fromYear={fromYear}
        toYear={toYear}
        onFromYearChange={onFromYearChange}
        onToYearChange={onToYearChange}
        isLoading={loading}
      />
    </div>
    {loading ? <div aria-label={loadingAriaLabel} className="mt-4 aspect-[640/220] w-full animate-pulse rounded bg-muted motion-reduce:animate-none" /> :
      values.length ? <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 block h-auto w-full overflow-visible" role="img" aria-label={chartAriaLabel} data-chart-size="640x220">
        <line x1={left} y1={top} x2={left} y2={height - bottom} className="stroke-border" />
        <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} className="stroke-border" />
        {yTicks.map((tick) => <g key={tick}>
          <line x1={left} y1={y(tick)} x2={width - right} y2={y(tick)} className="stroke-border/60" strokeDasharray="2 3" />
          <text x={left - 7} y={y(tick) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{formatMetricValue(tick, metric, true)}</text>
        </g>)}
        {segments.map((seriesSegments, seriesIndex) => seriesSegments.map((path, pathIndex) => <path
          key={`${series[seriesIndex].id}-${pathIndex}`}
          data-series-id={series[seriesIndex].id}
          d={path}
          fill="none"
          stroke={series[seriesIndex].color}
          strokeWidth="2.5"
        />))}
        {series.map((item) => item.points.map((point) => {
          if (point.value === null) return null;
          const index = years.indexOf(point.year);
          return <circle
            key={`${item.id}-${point.year}`}
            cx={x(index)}
            cy={y(point.value)}
            r="4"
            role="button"
            tabIndex={0}
            aria-label={`${item.name}, ${point.year}: ${formatMetricValue(point.value, metric)}${metric.valueFormat === "percent" ? "" : ` ${metric.unit}`}`}
            className="cursor-pointer stroke-background stroke-2 outline-none"
            style={{ fill: item.color }}
            onMouseEnter={() => setHoveredYear(point.year)}
            onMouseLeave={() => setHoveredYear(null)}
            onFocus={() => setHoveredYear(point.year)}
            onBlur={() => setHoveredYear(null)}
          />;
        }))}
        {xTickIndexes.map((index) => <text key={index} x={x(index)} y={height - 6} textAnchor={index === 0 ? "start" : index === years.length - 1 ? "end" : "middle"} className="fill-muted-foreground text-[10px]">{years[index]}</text>)}
        {hoveredYear !== null ? (() => {
          const yearIndex = years.indexOf(hoveredYear);
          const tooltipWidth = 250;
          const tooltipHeight = 29 + series.length * 16;
          const tooltipX = x(yearIndex) > width - right - tooltipWidth ? x(yearIndex) - tooltipWidth - 8 : x(yearIndex) + 8;
          return <g role="tooltip" transform={`translate(${tooltipX} 18)`} className="pointer-events-none">
            <rect width={tooltipWidth} height={tooltipHeight} rx="5" className="fill-popover stroke-border" />
            <text x="10" y="16" className="fill-popover-foreground text-[11px] font-semibold">{hoveredYear}</text>
            {series.map((item, index) => <g key={item.id} transform={`translate(0 ${27 + index * 16})`}>
              <circle cx="11" cy="0" r="3" fill={item.color} />
              <text x="20" y="4" className="fill-popover-foreground text-[10px]">{item.name}</text>
              <text x={tooltipWidth - 10} y="4" textAnchor="end" className="fill-popover-foreground text-[10px] font-medium tabular-nums">
                {valueMaps[index].get(hoveredYear) == null ? "No data" : formatMetricValue(valueMaps[index].get(hoveredYear)!, metric)}
              </text>
            </g>)}
          </g>;
        })() : null}
      </svg> : <p className="mt-4 flex aspect-[640/220] w-full items-center justify-center rounded bg-muted/50 text-xs text-muted-foreground">{isError ? "Trend data is currently unavailable." : emptyMessage}</p>}
    {isError && hasData ? <p role="status" className="mt-2 text-xs text-muted-foreground">Could not refresh trend data. Showing the last available history.</p> : null}
  </section>;
}
