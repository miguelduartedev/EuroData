import { useState } from "react";
import type { MetricDefinition } from "@/types/metric";
import type { TrendPoint } from "@/lib/metric-trend";

interface TrendChartProps {
  metric: MetricDefinition;
  points: readonly TrendPoint[];
  availableYears: readonly number[];
  fromYear: number | undefined;
  toYear: number | undefined;
  onFromYearChange: (year: number) => void;
  onToYearChange: (year: number) => void;
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
}

const numberFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1, notation: "compact" });
const exactNumberFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

export function TrendChart({
  metric, points, availableYears, fromYear, toYear, onFromYearChange, onToYearChange, isLoading, isError, hasData,
}: TrendChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ point: TrendPoint & { value: number }; index: number } | null>(null);
  const loading = isLoading && !hasData;
  const valid = points.filter((point): point is TrendPoint & { value: number } => point.value !== null);
  const min = Math.min(...valid.map((point) => point.value));
  const max = Math.max(...valid.map((point) => point.value));
  const width = 340;
  const height = 148;
  const left = 42;
  const right = 10;
  const top = 12;
  const bottom = 25;
  const x = (index: number) => left + (points.length < 2 ? 0 : index * (width - left - right) / (points.length - 1));
  const y = (value: number) => top + (max === min ? (height - top - bottom) / 2 : (max - value) * (height - top - bottom) / (max - min));
  const yTicks = max === min ? [max] : [max, (min + max) / 2, min];
  const xTickIndexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  const segments: string[] = [];
  points.forEach((point, index) => {
    if (point.value === null) return;
    const command = index === 0 || points[index - 1].value === null ? "M" : "L";
    if (command === "M") segments.push(`M ${x(index)} ${y(point.value)}`);
    else segments[segments.length - 1] += ` L ${x(index)} ${y(point.value)}`;
  });

  return (
    <section aria-label={`${metric.label} trend`} className="border-t border-border px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="pt-1 text-sm font-semibold">{metric.label} trend</h3>
        {loading ? <div aria-label="Loading trend range selectors" className="flex items-end gap-2">
          {['From', 'To'].map((label) => <div key={label} className="grid gap-1 text-[10px] font-medium text-muted-foreground">
            <span>{label}</span>
            <span aria-hidden="true" className="h-7 w-14 animate-pulse rounded border border-border bg-muted motion-reduce:animate-none" />
          </div>)}
        </div> : <div className="flex items-end gap-2">
          <label className="grid gap-1 text-[10px] font-medium text-muted-foreground">
            From
            <select
              aria-label="Trend start year"
              value={fromYear ?? ""}
              onChange={(event) => onFromYearChange(Number(event.target.value))}
              disabled={fromYear === undefined || toYear === undefined}
              className="h-7 rounded border border-border bg-background px-1.5 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {availableYears.filter((year) => toYear === undefined || year <= toYear).map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-[10px] font-medium text-muted-foreground">
            To
            <select
              aria-label="Trend end year"
              value={toYear ?? ""}
              onChange={(event) => onToYearChange(Number(event.target.value))}
              disabled={fromYear === undefined || toYear === undefined}
              className="h-7 rounded border border-border bg-background px-1.5 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {availableYears.filter((year) => fromYear === undefined || year >= fromYear).map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
        </div>}
      </div>
      {loading ? <div aria-label="Loading regional trend" className="mt-3 h-36 animate-pulse rounded bg-muted motion-reduce:animate-none" /> :
        valid.length ? <div className="mt-3">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full overflow-visible" role="img" aria-label={`${metric.label} historical line chart`}>
          <line x1={left} y1={top} x2={left} y2={height - bottom} className="stroke-border" />
          <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} className="stroke-border" />
          {yTicks.map((tick) => <g key={tick}>
            <line x1={left} y1={y(tick)} x2={width - right} y2={y(tick)} className="stroke-border/60" strokeDasharray="2 3" />
            <text x={left - 6} y={y(tick) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">{numberFormat.format(tick)}</text>
          </g>)}
          {segments.map((segment, index) => <path key={index} d={segment} fill="none" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="2.5" />)}
          {valid.map((point) => {
            const index = points.indexOf(point);
            return <circle
              key={point.year}
              cx={x(index)}
              cy={y(point.value)}
              r="4"
              tabIndex={0}
              role="button"
              aria-label={`${point.year}: ${exactNumberFormat.format(point.value)} ${metric.unit}`}
              className="cursor-pointer fill-blue-600 stroke-background stroke-2 outline-none dark:fill-blue-400"
              onMouseEnter={() => setHoveredPoint({ point, index })}
              onMouseLeave={() => setHoveredPoint(null)}
              onFocus={() => setHoveredPoint({ point, index })}
              onBlur={() => setHoveredPoint(null)}
            />;
          })}
          {xTickIndexes.map((index) => <text key={index} x={x(index)} y={height - 5} textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"} className="fill-muted-foreground text-[10px]">{points[index]?.year}</text>)}
          {hoveredPoint ? (() => {
            const tooltipText = `${hoveredPoint.point.year} · ${exactNumberFormat.format(hoveredPoint.point.value)}`;
            const tooltipWidth = Math.max(92, tooltipText.length * 7 + 20);
            const tooltipX = x(hoveredPoint.index) > width - right - tooltipWidth ? x(hoveredPoint.index) - tooltipWidth - 8 : x(hoveredPoint.index) + 8;
            const tooltipY = y(hoveredPoint.point.value) < top + 28 ? y(hoveredPoint.point.value) + 8 : y(hoveredPoint.point.value) - 33;
            return <g role="tooltip" transform={`translate(${tooltipX} ${tooltipY})`} className="pointer-events-none">
              <rect width={tooltipWidth} height="25" rx="4" className="fill-popover stroke-border" />
              <text x="10" y="17" className="fill-popover-foreground text-[12px] font-medium">{tooltipText}</text>
            </g>;
          })() : null}
          </svg>
        </div> : <p className="mt-3 flex h-36 items-center justify-center rounded bg-muted/50 text-xs text-muted-foreground">{isError ? "Trend data is currently unavailable." : "No historical data available."}</p>}
      {isError && hasData ? <p role="status" className="mt-2 text-xs text-muted-foreground">Could not refresh trend data. Showing the last available history.</p> : null}
    </section>
  );
}
