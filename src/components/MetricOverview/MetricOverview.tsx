import { useId, type ReactNode } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { DatabaseIcon, InfoIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { regionDisplayName } from "@/data/region-names";
import type { MetricSummary } from "@/lib/metric-summary";
import type { MetricDefinition } from "@/types/metric";
import { formatMetricValue } from "@/lib/metric-format";

interface MetricOverviewProps {
  metric: MetricDefinition;
  year: number;
  summary: MetricSummary;
  regionNames: ReadonlyMap<string, string>;
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
}

const numberFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

export function MetricOverview({ metric, year, summary, regionNames, isLoading, isError, hasData }: MetricOverviewProps) {
  const headingId = useId();
  const averageTooltipId = useId();
  const unavailable = isError && !hasData;
  const loading = isLoading && !hasData;
  const format = (value: number | null) => value === null ? "No data" : formatMetricValue(value, metric);
  const stats: { label: string; value: string; detail: string; help?: ReactNode }[] = [
    {
      label: "Regional average", value: format(summary.average), detail: metric.unit,
      help: <Tooltip.Root>
        <Tooltip.Trigger aria-label="About regional average" aria-describedby={averageTooltipId} className="rounded text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <InfoIcon aria-hidden="true" className="size-3" />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={6} className="z-50">
            <Tooltip.Popup id={averageTooltipId} role="tooltip" className="max-w-64 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm">
              Unweighted average of regions with available data.
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>,
    },
    { label: "Highest region", value: format(summary.highest?.value ?? null), detail: summary.highest ? regionDisplayName(summary.highest.regionId, regionNames) : "No region with data" },
    { label: "Lowest region", value: format(summary.lowest?.value ?? null), detail: summary.lowest ? regionDisplayName(summary.lowest.regionId, regionNames) : "No region with data" },
    { label: "Total regions", value: numberFormat.format(summary.count), detail: "NUTS 2 regions with data" },
  ];

  return (
    <Card aria-labelledby={headingId} aria-busy={loading} className="gap-0 rounded-lg border border-border py-0 shadow-none ring-0">
      <div className="border-b border-border p-4">
        <h2 id={headingId} className="mb-3 text-sm font-medium">Explore this metric</h2>
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <DatabaseIcon aria-hidden="true" className="size-6" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold leading-tight tracking-tight">{metric.label}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{metric.description}</p>
          </div>
          <span aria-label={`Selected year: ${year}`} className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm font-medium tabular-nums">{year}</span>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-y-4 py-4 sm:grid-cols-4">
        {stats.map(({ label, value, detail, help }, index) => (
          <div key={label} className={`min-w-0 px-3 ${index % 2 ? "border-l border-border" : index ? "sm:border-l sm:border-border" : ""}`}>
            <dt className="flex min-h-8 items-start gap-1 text-xs leading-4 text-muted-foreground">{label}{help}</dt>
            <dd className="mt-1">
              {loading ? <span aria-label={`Loading ${label.toLowerCase()}`} className="block h-6 w-16 animate-pulse rounded bg-muted motion-reduce:animate-none" /> :
                <span className="block text-lg font-semibold leading-6 tracking-tight tabular-nums">{unavailable ? "—" : value}</span>}
              <span className="mt-1 block break-words text-xs leading-4 text-muted-foreground">{loading || unavailable ? "\u00a0" : detail}</span>
            </dd>
          </div>
        ))}
      </dl>
      {isError && <p role="status" className="px-4 pb-3 text-xs text-muted-foreground">{hasData ? "Could not refresh data. Showing the last available snapshot." : "Metric data is currently unavailable."}</p>}
    </Card>
  );
}
