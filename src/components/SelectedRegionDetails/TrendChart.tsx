import { MetricTrendChart } from "@/components/MetricTrendChart/MetricTrendChart";
import type { TrendPoint } from "@/lib/metric-trend";
import type { MetricDefinition } from "@/types/metric";

interface TrendChartProps {
  metric: MetricDefinition;
  regionId: string;
  regionName: string;
  color: string;
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

export function TrendChart({
  metric, regionId, regionName, color, points, availableYears, fromYear, toYear,
  onFromYearChange, onToYearChange, isLoading, isError, hasData,
}: TrendChartProps) {
  return <MetricTrendChart
    metric={metric}
    series={[{ id: regionId, name: regionName, color, points }]}
    availableYears={availableYears}
    fromYear={fromYear}
    toYear={toYear}
    onFromYearChange={onFromYearChange}
    onToYearChange={onToYearChange}
    isLoading={isLoading}
    isError={isError}
    hasData={hasData}
    variant="embedded"
    sectionAriaLabel={`${metric.label} trend`}
    chartAriaLabel={`${metric.label} historical line chart`}
    loadingAriaLabel="Loading regional trend"
    emptyMessage="No historical data available."
  />;
}
