import { useEffect, useMemo, useState } from "react"
import { ExternalLinkIcon } from "lucide-react"
import {
  useNuts2MetricSnapshot,
  useNuts2MetricYears,
  useRegionMetricHistory,
} from "./api/eurostat/queries"
import { EUROSTAT_SNAPSHOT_YEAR } from "./api/eurostat/metrics"
import { getMetricDefinition, metrics } from "./data/metrics"
import { availableMetricYear } from "./lib/metric-year"
import { buildMetricLookup } from "./lib/choropleth"
import { MapControls } from "./components/MapControls/MapControls"
import { MetricOverview } from "./components/MetricOverview/MetricOverview"
import { MapGuidance } from "./components/MapGuidance/MapGuidance"
import { EuropeMap } from "./components/EuropeMap/EuropeMap"
import { summarizeMetric } from "./lib/metric-summary"
import { useRegionCatalog } from "./data/region-names"
import { SelectedRegionDetails } from "./components/SelectedRegionDetails/SelectedRegionDetails"
import { RegionComparison } from "./components/RegionComparison/RegionComparison"
import { ThemeToggle } from "./components/ThemeToggle/ThemeToggle"
import { REGION_A_COLOR, REGION_B_COLOR } from "./lib/region-colors"
import { selectMapRegion, type RegionSelections } from "./lib/region-selection"
import { metricRank, trendPoints } from "./lib/metric-trend"
import {
  mapComparableRegionValues,
  metricDistribution,
} from "./lib/metric-exploration"
import type { MetricId } from "./types/metric"
import { RegionalDistribution } from "./components/RegionalDistribution/RegionalDistribution"
import { ExploreRegions } from "./components/ExploreRegions/ExploreRegions"
import "./App.css"

const initialRegionSelections: RegionSelections = {
  regionAId: undefined,
  regionBId: undefined,
}
const noSelectableRegions = new Set<string>()

export function App() {
  const [metricId, setMetricId] = useState<MetricId>("gdp_per_capita")
  const [selectedYear, setSelectedYear] = useState<number | undefined>(
    undefined,
  )
  const metricYears = useNuts2MetricYears(metricId)
  const year = metricYears.data?.length
    ? availableMetricYear(selectedYear ?? metricYears.data[0], metricYears.data)
    : (selectedYear ?? EUROSTAT_SNAPSHOT_YEAR)
  const snapshot = useNuts2MetricSnapshot(
    metricId,
    metricYears.data?.length ? year : null,
  )
  useEffect(() => {
    if (metricYears.data?.length && selectedYear !== year) setSelectedYear(year)
  }, [metricYears.data, selectedYear, year])
  const regionCatalog = useRegionCatalog()
  const selectableRegionIds =
    regionCatalog.data?.selectableIds ?? noSelectableRegions
  const regionNames = useMemo(
    () =>
      new Map(
        [...(regionCatalog.data?.metadata ?? [])].map(([id, region]) => [
          id,
          region.name,
        ]),
      ),
    [regionCatalog.data],
  )
  const summary = useMemo(
    () =>
      summarizeMetric(snapshot.data ?? [], metricId, year, selectableRegionIds),
    [snapshot.data, metricId, year, selectableRegionIds],
  )
  const availableYears = useMemo(
    () =>
      Array.from(new Set([year, ...(metricYears.data ?? [])])).sort(
        (first, second) => second - first,
      ),
    [metricYears.data, year],
  )
  const metricValues = useMemo(
    () => buildMetricLookup(snapshot.data ?? [], metricId, year),
    [metricId, year, snapshot.data],
  )
  const selectedMetric = getMetricDefinition(metricId)
  const comparableMetricValues = useMemo(
    () =>
      mapComparableRegionValues(
        snapshot.data ?? [],
        metricId,
        year,
        selectableRegionIds,
      ),
    [metricId, selectableRegionIds, snapshot.data, year],
  )
  const distributionBands = useMemo(
    () =>
      metricDistribution(
        comparableMetricValues,
        selectedMetric.choropleth,
        selectedMetric.valueFormat,
      ),
    [
      comparableMetricValues,
      selectedMetric.choropleth,
      selectedMetric.valueFormat,
    ],
  )
  const handleMetricChange = (nextMetricId: MetricId) => {
    setMetricId(nextMetricId)
    setSelectedYear(undefined)
  }
  const [regionSelections, setRegionSelections] = useState<RegionSelections>(
    initialRegionSelections,
  )
  const selectedIds = [
    regionSelections.regionAId,
    regionSelections.regionBId,
  ].filter((id): id is string => id !== undefined)
  const singleRegionId = selectedIds.length === 1 ? selectedIds[0] : undefined
  const history = useRegionMetricHistory(selectedIds, metricId)
  const selectedTrend = useMemo(
    () =>
      singleRegionId
        ? trendPoints(history.data ?? [], singleRegionId, metricId)
        : [],
    [history.data, metricId, singleRegionId],
  )
  const selectedRank = useMemo(
    () =>
      singleRegionId
        ? metricRank(
            snapshot.data ?? [],
            metricId,
            year,
            singleRegionId,
            selectedMetric.rankDirection,
            selectableRegionIds,
          )
        : null,
    [
      metricId,
      selectedMetric.rankDirection,
      year,
      singleRegionId,
      snapshot.data,
      selectableRegionIds,
    ],
  )
  const comparisonRegionIds =
    selectedIds.length === 2 ? (selectedIds as [string, string]) : undefined
  const comparisonTrends = useMemo(
    () =>
      comparisonRegionIds
        ? ([
            trendPoints(history.data ?? [], comparisonRegionIds[0], metricId),
            trendPoints(history.data ?? [], comparisonRegionIds[1], metricId),
          ] as const)
        : undefined,
    [
      comparisonRegionIds?.[0],
      comparisonRegionIds?.[1],
      history.data,
      metricId,
    ],
  )
  const comparisonRanks = useMemo(
    () =>
      comparisonRegionIds
        ? ([
            metricRank(
              snapshot.data ?? [],
              metricId,
              year,
              comparisonRegionIds[0],
              selectedMetric.rankDirection,
              selectableRegionIds,
            ),
            metricRank(
              snapshot.data ?? [],
              metricId,
              year,
              comparisonRegionIds[1],
              selectedMetric.rankDirection,
              selectableRegionIds,
            ),
          ] as const)
        : undefined,
    [
      comparisonRegionIds?.[0],
      comparisonRegionIds?.[1],
      metricId,
      selectedMetric.rankDirection,
      year,
      snapshot.data,
      selectableRegionIds,
    ],
  )

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
              <img
                src="/favicon.svg"
                alt=""
                width={48}
                height={48}
                className="size-12 shrink-0"
              />
              <div className="min-w-0">
                <h1 className="m-0 text-[22px] leading-7 font-semibold tracking-[-0.04em] text-foreground">
                  EuroData
                </h1>
                <p className="mt-0.5 text-xs leading-4 text-muted-foreground sm:text-[13px] sm:leading-[18px]">
                  Explore European regions with Eurostat data.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
              <a
                href="https://miguelduartedev.github.io/portfolio/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit Miguel Duarte's portfolio"
                className="group flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              >
                <span className="hidden md:inline">Built by</span>
                <span className="hidden font-medium sm:inline">
                  Miguel Duarte
                </span>
                <ExternalLinkIcon
                  aria-hidden="true"
                  className="size-3.5"
                  strokeWidth={1.7}
                />
              </a>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:min-h-0 lg:items-start lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:grid-cols-2">
          <section
            className="min-w-0 overflow-hidden border-b border-border lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:border-r lg:border-b-0"
            aria-label="European NUTS 2 region map"
          >
            <div className="shrink-0 border-b border-border bg-card px-[clamp(20px,3vw,36px)] py-[18px]">
              <MapControls
                metrics={metrics}
                metricId={metricId}
                onMetricChange={handleMetricChange}
                years={metricYears.data?.length ? availableYears : []}
                year={metricYears.data?.length ? year : undefined}
                onYearChange={setSelectedYear}
                isYearLoading={metricYears.isPending}
                yearStatus={
                  metricYears.isError
                    ? "Showing the default year while available years are unavailable."
                    : undefined
                }
              />
            </div>
            <EuropeMap
              metric={{
                values: metricValues,
                label: selectedMetric.label,
                unit: selectedMetric.unit,
                year,
                scale: selectedMetric.choropleth,
                valueFormat: selectedMetric.valueFormat,
                isLoading: snapshot.isPending,
                isError: snapshot.isError,
              }}
              regionAId={regionSelections.regionAId}
              regionBId={regionSelections.regionBId}
              onRegionClick={handleMapRegionClick}
            />
          </section>
          <aside className="grid min-w-0 content-start gap-4 p-[clamp(20px,3vw,36px)] lg:h-full lg:min-h-0 lg:auto-rows-max lg:overflow-y-auto">
            {comparisonRegionIds && comparisonTrends && comparisonRanks ? (
              <RegionComparison
                metric={selectedMetric}
                year={year}
                regions={[
                  {
                    slot: "Region A",
                    metadata: regionCatalog.data?.metadata.get(
                      comparisonRegionIds[0],
                    ) ?? {
                      id: comparisonRegionIds[0],
                      name: comparisonRegionIds[0],
                    },
                    color: REGION_A_COLOR,
                    value: metricValues.get(comparisonRegionIds[0]) ?? null,
                    rank: comparisonRanks[0],
                    trend: comparisonTrends[0],
                  },
                  {
                    slot: "Region B",
                    metadata: regionCatalog.data?.metadata.get(
                      comparisonRegionIds[1],
                    ) ?? {
                      id: comparisonRegionIds[1],
                      name: comparisonRegionIds[1],
                    },
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
              />
            ) : (
              <>
                <MetricOverview
                  metric={selectedMetric}
                  year={year}
                  summary={summary}
                  regionNames={regionNames}
                  isLoading={snapshot.isPending}
                  isError={snapshot.isError}
                  hasData={snapshot.data !== undefined}
                />
                {singleRegionId ? (
                  <SelectedRegionDetails
                    region={
                      regionCatalog.data?.metadata.get(singleRegionId) ?? {
                        id: singleRegionId,
                        name: singleRegionId,
                      }
                    }
                    metric={selectedMetric}
                    year={year}
                    value={metricValues.get(singleRegionId) ?? null}
                    color={
                      regionSelections.regionAId === singleRegionId
                        ? REGION_A_COLOR
                        : REGION_B_COLOR
                    }
                    isLoading={snapshot.isPending}
                    isError={snapshot.isError}
                    hasData={snapshot.data !== undefined}
                    trend={selectedTrend}
                    rank={selectedRank}
                    isHistoryLoading={history.isPending}
                    isHistoryError={history.isError}
                    hasHistoryData={history.data !== undefined}
                  />
                ) : (
                  <>
                    <MapGuidance />
                    <RegionalDistribution
                      metric={selectedMetric}
                      year={year}
                      bands={distributionBands}
                      total={comparableMetricValues.length}
                      isLoading={snapshot.isPending}
                      isError={snapshot.isError}
                      hasData={snapshot.data !== undefined}
                    />
                    <ExploreRegions
                      metric={selectedMetric}
                      year={year}
                      values={comparableMetricValues}
                      metadata={regionCatalog.data?.metadata ?? new Map()}
                      onRegionClick={handleMapRegionClick}
                      isLoading={snapshot.isPending}
                      isError={snapshot.isError}
                      hasData={snapshot.data !== undefined}
                    />
                  </>
                )}
              </>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
