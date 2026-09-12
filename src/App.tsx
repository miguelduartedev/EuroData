import { MetricTrend } from "./components/MetricTrend/MetricTrend";
import { NordicMap } from "./components/NordicMap/NordicMap";
import { RegionComparison } from "./components/RegionComparison/RegionComparison";
import { RegionSelector } from "./components/RegionSelector/RegionSelector";
import "./App.css";

export function App() {
  const handleMapRegionClick = (regionId: string) => {
    console.info("Clicked Nordic NUTS 2 region:", regionId);
    // TODO: Replace this debug output with candidate-owned selection behaviour.
  };

  return (
    <main className="min-h-screen bg-[#f7f9fb]">
      <header className="border-b border-[#dbe3ed] bg-white px-[clamp(20px,4vw,56px)] py-[22px]">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[#455a75]">NORDIC DATA</p>
          <h1 className="m-0 text-[clamp(1.45rem,2.4vw,2rem)] tracking-[-0.035em]">Nordic Life Data Explorer</h1>
          <p className="mt-[5px] text-slate-500">Compare Nordic regions using official-style data.</p>
        </div>
      </header>

      <div className="flex items-end gap-5 border-b border-[#dbe3ed] bg-white px-[clamp(20px,4vw,56px)] py-[18px] max-[600px]:flex-col max-[600px]:items-stretch">
        <RegionSelector label="Region A" />
        <span className="py-2.5 text-2xl text-slate-500 max-[600px]:self-center max-[600px]:py-0" aria-label="Swap regions placeholder">↔</span>
        <RegionSelector label="Region B" />
        {/* TODO: Add selection state, selection synchronisation, and swap behaviour. */}
      </div>

      <div className="grid min-h-[calc(100vh-197px)] grid-cols-[minmax(360px,1fr)_minmax(380px,1fr)] max-[900px]:grid-cols-1">
        <section className="overflow-hidden border-r border-[#dbe3ed] max-[900px]:border-r-0 max-[900px]:border-b" aria-label="Nordic region map">
          <NordicMap onRegionClick={handleMapRegionClick} />
          {/* TODO: Pass application-owned selection and decide how map clicks affect it. */}
        </section>
        <aside className="grid content-start gap-4 p-[clamp(20px,3vw,36px)]">
          <RegionComparison />
          <MetricTrend />
        </aside>
      </div>
    </main>
  );
}
