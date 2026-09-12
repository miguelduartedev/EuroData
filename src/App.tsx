import { useState } from "react"
import { MetricTrend } from "./components/MetricTrend/MetricTrend"
import { NordicMap } from "./components/NordicMap/NordicMap"
import { RegionComparison } from "./components/RegionComparison/RegionComparison"
import { RegionProfileRow } from "./components/RegionProfileCard/RegionProfileCard"
import { RegionSelector } from "./components/RegionSelector/RegionSelector"
import { ThemeToggle } from "./components/ThemeToggle/ThemeToggle"
import { Button } from "./components/ui/button"
import { regions } from "./data/regions"
import { REGION_A_COLOR, REGION_B_COLOR } from "./lib/region-colors"
import {
  selectMapRegion,
  setRegionSelection,
  swapRegionSelections,
  type RegionSelections,
} from "./lib/region-selection"
import "./App.css"
import { ArrowLeftRightIcon } from "lucide-react"

const initialRegionSelections: RegionSelections = {
  regionAId: undefined,
  regionBId: undefined,
}

export function App() {
  const [regionSelections, setRegionSelections] = useState<RegionSelections>(
    initialRegionSelections,
  )
  const regionA = regions.find(
    (region) => region.id === regionSelections.regionAId,
  )
  const regionB = regions.find(
    (region) => region.id === regionSelections.regionBId,
  )

  const handleMapRegionClick = (regionId: string) => {
    setRegionSelections((currentSelections) =>
      selectMapRegion(currentSelections, regionId),
    )
  }

  const handleRegionAChange = (regionId: string | undefined) => {
    setRegionSelections((currentSelections) =>
      setRegionSelection(currentSelections, "regionAId", regionId),
    )
  }

  const handleRegionBChange = (regionId: string | undefined) => {
    setRegionSelections((currentSelections) =>
      setRegionSelection(currentSelections, "regionBId", regionId),
    )
  }

  const handleSwapRegions = () => {
    setRegionSelections((currentSelections) =>
      swapRegionSelections(currentSelections),
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="w-full lg:grid lg:h-dvh lg:grid-rows-[auto_minmax(0,1fr)]">
        <header className="border-b border-border bg-card px-[clamp(20px,3vw,36px)] py-[22px]">
          <div className="flex min-w-0 items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/favicon.svg" alt="" className="size-14 shrink-0" />
              <div className="min-w-0">
                <h1 className="m-0 text-[clamp(1.45rem,2.4vw,1.25rem)] tracking-[-0.035em]">
                  Nordic Life Data Explorer
                </h1>
                <p className="mt-[5px] text-slate-500 dark:text-slate-400">
                  Compare Nordic regions using Eurostat regional data.
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:min-h-0 lg:items-start lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:grid-cols-2">
          <section
            className="min-w-0 overflow-hidden border-b border-border lg:flex lg:h-full lg:flex-col lg:border-r lg:border-b-0"
            aria-label="Nordic region map"
          >
            <div className="flex shrink-0 items-end gap-5 border-b border-border bg-card px-[clamp(20px,3vw,36px)] py-[18px] max-xl:flex-col max-xl:items-stretch max-xl:[&>section]:max-w-none xl:[&>section]:min-w-0 xl:[&>section]:flex-1">
              <RegionSelector
                label="Region A"
                regions={regions}
                value={regionSelections.regionAId}
                onChange={handleRegionAChange}
                accentColor={REGION_A_COLOR}
                unavailableRegionIds={
                  regionSelections.regionBId ? [regionSelections.regionBId] : []
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={
                  regionSelections.regionAId === undefined &&
                  regionSelections.regionBId === undefined
                }
                aria-label="Swap selected regions"
                className="mb-1.5 text-slate-500 max-xl:self-center"
                onClick={handleSwapRegions}
              >
                <ArrowLeftRightIcon />
              </Button>
              <RegionSelector
                label="Region B"
                regions={regions}
                value={regionSelections.regionBId}
                onChange={handleRegionBChange}
                accentColor={REGION_B_COLOR}
                unavailableRegionIds={
                  regionSelections.regionAId ? [regionSelections.regionAId] : []
                }
              />
            </div>
            <NordicMap
              regionAId={regionSelections.regionAId}
              regionBId={regionSelections.regionBId}
              onRegionClick={handleMapRegionClick}
            />
          </section>
          <aside className="grid min-w-0 content-start gap-4 p-[clamp(20px,3vw,36px)]">
            <RegionProfileRow
              regionA={regionA}
              regionB={regionB}
              regionAColor={REGION_A_COLOR}
              regionBColor={REGION_B_COLOR}
            />
            <RegionComparison />
            <MetricTrend />
          </aside>
        </div>
      </div>
    </main>
  )
}
