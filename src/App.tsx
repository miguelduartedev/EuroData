import { useMemo, useState } from "react"
import { useNuts2MetricSnapshot, useNuts2MetricYears, useRegionMetricHistory } from "./api/eurostat/queries"
import { EUROSTAT_SNAPSHOT_YEAR } from "./api/eurostat/metrics"
import { metrics } from "./data/metrics"
import { gdpChoroplethScale } from "./data/map-metric"
import { buildMetricLookup } from "./lib/choropleth"
import { MapControls } from "./components/MapControls/MapControls"
import { MetricOverview } from "./components/MetricOverview/MetricOverview"
import { MapGuidance } from "./components/MapGuidance/MapGuidance"
import { NordicMap } from "./components/NordicMap/NordicMap"
import { summarizeMetric } from "./lib/metric-summary"
import { useRegionMetadata } from "./data/region-names"
import { SelectedRegionDetails } from "./components/SelectedRegionDetails/SelectedRegionDetails"
import { RegionComparison } from "./components/RegionComparison/RegionComparison"
import { ThemeToggle } from "./components/ThemeToggle/ThemeToggle"
import { REGION_A_COLOR, REGION_B_COLOR } from "./lib/region-colors"
import { selectMapRegion, type RegionSelections } from "./lib/region-selection"
import { metricRank, trendPoints } from "./lib/metric-trend"
import type { MetricId } from "./types/metric"
import "./App.css"

const initialRegionSelections: RegionSelections = {
  regionAId: undefined,
  regionBId: undefined,
}

const mapMetricIds: readonly MetricId[] = ["gdp_per_capita"]
const mapMetrics = metrics.filter((metric) => mapMetricIds.includes(metric.id))

export function App() {
  const [metricId, setMetricId] = useState<MetricId>("gdp_per_capita")
  const [selectedYear, setSelectedYear] = useState(EUROSTAT_SNAPSHOT_YEAR)
  const metricYears = useNuts2MetricYears(metricId)
  const snapshot = useNuts2MetricSnapshot(metricId, selectedYear)
  const regionMetadata = useRegionMetadata()
  const regionNames = useMemo(
    () => new Map([...regionMetadata.data ?? []].map(([id, region]) => [id, region.name])),
    [regionMetadata.data],
  )
  const summary = useMemo(
    () => summarizeMetric(snapshot.data ?? [], metricId, selectedYear),
    [snapshot.data, metricId, selectedYear],
  )
  const availableYears = useMemo(
    () => Array.from(new Set([selectedYear, ...(metricYears.data ?? [EUROSTAT_SNAPSHOT_YEAR])]))
      .sort((first, second) => second - first),
    [metricYears.data, selectedYear],
  )
  const metricValues = useMemo(
    () => buildMetricLookup(snapshot.data ?? [], metricId, selectedYear),
    [metricId, selectedYear, snapshot.data],
  )
  const selectedMetric = mapMetrics.find((metric) => metric.id === metricId) ?? mapMetrics[0]
  const [regionSelections, setRegionSelections] = useState<RegionSelections>(
    initialRegionSelections,
  )
  const selectedIds = [regionSelections.regionAId, regionSelections.regionBId]
    .filter((id): id is string => id !== undefined)
  const singleRegionId = selectedIds.length === 1 ? selectedIds[0] : undefined
  const history = useRegionMetricHistory(selectedIds, metricId)
  const selectedTrend = useMemo(
    () => singleRegionId ? trendPoints(history.data ?? [], singleRegionId, metricId) : [],
    [history.data, metricId, singleRegionId],
  )
  const selectedRank = useMemo(
    () => singleRegionId ? metricRank(snapshot.data ?? [], metricId, selectedYear, singleRegionId, selectedMetric.rankDirection) : null,
    [metricId, selectedMetric.rankDirection, selectedYear, singleRegionId, snapshot.data],
  )
  const comparisonRegionIds = selectedIds.length === 2 ? selectedIds as [string, string] : undefined
  const comparisonTrends = useMemo(() => comparisonRegionIds ? [
    trendPoints(history.data ?? [], comparisonRegionIds[0], metricId),
    trendPoints(history.data ?? [], comparisonRegionIds[1], metricId),
  ] as const : undefined, [comparisonRegionIds?.[0], comparisonRegionIds?.[1], history.data, metricId])
  const comparisonRanks = useMemo(() => comparisonRegionIds ? [
    metricRank(snapshot.data ?? [], metricId, selectedYear, comparisonRegionIds[0], selectedMetric.rankDirection),
    metricRank(snapshot.data ?? [], metricId, selectedYear, comparisonRegionIds[1], selectedMetric.rankDirection),
  ] as const : undefined, [comparisonRegionIds?.[0], comparisonRegionIds?.[1], metricId, selectedMetric.rankDirection, selectedYear, snapshot.data])

  const handleMapRegionClick = (regionId: string) => {
    setRegionSelections((currentSelections) =>
      selectMapRegion(currentSelections, regionId),
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="w-full lg:grid lg:h-dvh lg:grid-rows-[auto_minmax(0,1fr)]">
        <header className="border-b border-border bg-card px-[clamp(20px,3vw,36px)] py-3">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <img src="/favicon.svg" alt="" width={48} height={48} className="size-12 shrink-0" />
              <div className="min-w-0">
                <h1 className="m-0 text-[22px] leading-7 font-semibold tracking-[-0.04em] text-foreground">
                  EuroData
                </h1>
                <p className="mt-0.5 text-xs leading-4 text-muted-foreground sm:text-[13px] sm:leading-[18px]">
                  Explore European regions with Eurostat data.
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:min-h-0 lg:items-start lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:grid-cols-2">
          <section
            className="min-w-0 overflow-hidden border-b border-border lg:flex lg:h-full lg:flex-col lg:border-r lg:border-b-0"
            aria-label="European NUTS 2 region map"
          >
            <div className="shrink-0 border-b border-border bg-card px-[clamp(20px,3vw,36px)] py-[18px]">
              <MapControls
                metrics={mapMetrics}
                metricId={metricId}
                onMetricChange={setMetricId}
                years={availableYears}
                year={selectedYear}
                onYearChange={setSelectedYear}
                isYearLoading={metricYears.isPending}
                yearStatus={
                  metricYears.isError
                    ? "Showing the default year while available years are unavailable."
                    : undefined
                }
              />
            </div>
            <NordicMap
              metric={{
                values: metricValues,
                label: selectedMetric.label,
                unit: selectedMetric.unit,
                year: selectedYear,
                scale: gdpChoroplethScale,
                isLoading: snapshot.isPending,
                isError: snapshot.isError,
              }}
              regionAId={regionSelections.regionAId}
              regionBId={regionSelections.regionBId}
              onRegionClick={handleMapRegionClick}
            />
          </section>
          <aside className="grid min-w-0 content-start gap-4 p-[clamp(20px,3vw,36px)]">
            {comparisonRegionIds && comparisonTrends && comparisonRanks ? <RegionComparison
              metric={selectedMetric}
              year={selectedYear}
              regions={[
                {
                  slot: "Region A",
                  metadata: regionMetadata.data?.get(comparisonRegionIds[0]) ?? { id: comparisonRegionIds[0], name: comparisonRegionIds[0] },
                  color: REGION_A_COLOR,
                  value: metricValues.get(comparisonRegionIds[0]) ?? null,
                  rank: comparisonRanks[0],
                  trend: comparisonTrends[0],
                },
                {
                  slot: "Region B",
                  metadata: regionMetadata.data?.get(comparisonRegionIds[1]) ?? { id: comparisonRegionIds[1], name: comparisonRegionIds[1] },
                  color: REGION_B_COLOR,
                  value: metricValues.get(comparisonRegionIds[1]) ?? null,
                  rank: comparisonRanks[1],
                  trend: comparisonTrends[1],
                },
              ]}
              isSnapshotLoading={snapshot.isPending}
              isSnapshotError={snapshot.isError}
              hasSnapshotData={snapshot.data !== undefined}
              isHistoryLoading={history.isPending}
              isHistoryError={history.isError}
              hasHistoryData={history.data !== undefined}
              onClear={() => setRegionSelections(initialRegionSelections)}
            /> : <>
              <MetricOverview
                metric={selectedMetric}
                year={selectedYear}
                summary={summary}
                regionNames={regionNames}
                isLoading={snapshot.isPending}
                isError={snapshot.isError}
                hasData={snapshot.data !== undefined}
              />
              {singleRegionId ? <SelectedRegionDetails
                region={regionMetadata.data?.get(singleRegionId) ?? { id: singleRegionId, name: singleRegionId }}
                metric={selectedMetric}
                year={selectedYear}
                value={metricValues.get(singleRegionId) ?? null}
                color={regionSelections.regionAId === singleRegionId ? REGION_A_COLOR : REGION_B_COLOR}
                isLoading={snapshot.isPending}
                isError={snapshot.isError}
                hasData={snapshot.data !== undefined}
                trend={selectedTrend}
                rank={selectedRank}
                isHistoryLoading={history.isPending}
                isHistoryError={history.isError}
                hasHistoryData={history.data !== undefined}
              /> : <MapGuidance />}
            </>}
          </aside>
        </div>
      </div>
    </main>
  )
}
