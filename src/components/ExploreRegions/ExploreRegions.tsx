import { useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon, CompassIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatMetricValue } from "@/lib/metric-format";
import { exploreRegions, type MapComparableRegionValue } from "@/lib/metric-exploration";
import type { RegionMetadata } from "@/data/region-names";
import type { MetricDefinition } from "@/types/metric";

interface ExploreRegionsProps {
  metric: MetricDefinition;
  year: number;
  values: readonly MapComparableRegionValue[];
  metadata: ReadonlyMap<string, RegionMetadata>;
  onRegionClick: (regionId: string) => void;
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
}

export function ExploreRegions({ metric, year, values, metadata, onRegionClick, isLoading, isError, hasData }: ExploreRegionsProps) {
  const [order, setOrder] = useState<"highest" | "lowest">("highest");
  const [page, setPage] = useState(1);
  const loading = isLoading && !hasData;
  const unavailable = isError && !hasData;
  const regions = exploreRegions(values, order, values.length);
  const totalPages = Math.max(1, Math.ceil(regions.length / 5));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * 5;
  const pageRegions = regions.slice(pageStart, pageStart + 5);

  useEffect(() => {
    setPage(1);
  }, [metric.id, year]);

  return <Card aria-busy={loading} className="gap-0 rounded-lg border border-border py-0 shadow-none ring-0">
    <div className="flex items-center justify-between gap-3 border-b border-border p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
          <CompassIcon aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </span>
        <h2 className="text-sm font-semibold">Explore regions</h2>
      </div>
      <div className="flex rounded-md border border-border p-0.5 text-xs" role="group" aria-label="Region value order">
        {(["highest", "lowest"] as const).map((option) => <button
          key={option}
          type="button"
          onClick={() => {
            setOrder(option);
            setPage(1);
          }}
          aria-pressed={order === option}
          className={`cursor-pointer rounded px-2 py-1 font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${order === option ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >{option[0].toUpperCase()}{option.slice(1)}</button>)}
      </div>
    </div>
    <div className="p-2">
      {loading ? <div aria-label="Loading explorable regions" className="h-72 animate-pulse rounded bg-muted motion-reduce:animate-none" /> :
        regions.length ? <>
          <ol className="divide-y divide-border">
          {pageRegions.map(({ regionId, value }, index) => {
            const region = metadata.get(regionId) ?? { id: regionId, name: regionId };
            const detail = region.countryName ? `${region.countryName} · ${regionId}` : regionId;
            return <li key={regionId}>
              <button type="button" onClick={() => onRegionClick(regionId)} className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="w-5 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">{pageStart + index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{region.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{detail}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatMetricValue(value, metric)}</span>
              </button>
            </li>;
          })}
          </ol>
          <nav aria-label="Explore regions pagination" className="flex items-center justify-end gap-1 px-2 pt-3">
            <button type="button" aria-label="First page" title="First page" onClick={() => setPage(1)} disabled={currentPage === 1} className="inline-flex size-7 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"><ChevronsLeftIcon aria-hidden="true" className="size-4" /></button>
            <button type="button" aria-label="Previous page" title="Previous page" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} className="inline-flex size-7 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeftIcon aria-hidden="true" className="size-4" /></button>
            <span aria-label={`Page ${currentPage} of ${totalPages}`} className="min-w-12 px-1 text-center text-xs font-medium tabular-nums text-muted-foreground">{currentPage} / {totalPages}</span>
            <button type="button" aria-label="Next page" title="Next page" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage === totalPages} className="inline-flex size-7 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"><ChevronRightIcon aria-hidden="true" className="size-4" /></button>
            <button type="button" aria-label="Last page" title="Last page" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages} className="inline-flex size-7 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"><ChevronsRightIcon aria-hidden="true" className="size-4" /></button>
          </nav>
        </> : <p className="flex h-28 items-center justify-center rounded bg-muted/50 text-xs text-muted-foreground">{unavailable ? "Metric data is currently unavailable." : "No data available"}</p>}
      {isError && hasData ? <p role="status" className="px-2 py-2 text-xs text-muted-foreground">Could not refresh data. Showing the last available snapshot.</p> : null}
    </div>
  </Card>;
}
