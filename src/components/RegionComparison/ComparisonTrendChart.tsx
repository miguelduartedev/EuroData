import { MetricTrendChart, type MetricTrendSeries } from "@/components/MetricTrendChart/MetricTrendChart";
import type { MetricDefinition } from "@/types/metric";

export type ComparisonTrendSeries = MetricTrendSeries;

interface ComparisonTrendChartProps {
  metric: MetricDefinition;
  series: readonly [ComparisonTrendSeries, ComparisonTrendSeries];
  availableYears: readonly number[];
  fromYear: number | undefined;
  toYear: number | undefined;
  onFromYearChange: (year: number) => void;
  onToYearChange: (year: number) => void;
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
}

export function ComparisonTrendChart({
  metric, series, availableYears, fromYear, toYear, onFromYearChange, onToYearChange, isLoading, isError, hasData,
}: ComparisonTrendChartProps) {
  return <MetricTrendChart
    metric={metric}
    series={series}
    availableYears={availableYears}
    fromYear={fromYear}
    toYear={toYear}
    onFromYearChange={onFromYearChange}
    onToYearChange={onToYearChange}
    isLoading={isLoading}
    isError={isError}
    hasData={hasData}
    variant="card"
    sectionAriaLabel={`${metric.label} comparison trend`}
    chartAriaLabel={`${metric.label} comparison line chart`}
    loadingAriaLabel="Loading comparison trend"
    emptyMessage="No overlapping historical data available."
  />;
}
