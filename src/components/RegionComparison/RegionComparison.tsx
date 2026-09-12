export function RegionComparison() {
  return (
    <section className="min-h-[220px] rounded-lg border border-t-4 border-[#dbe3ed] border-t-[#00a394] bg-white p-6" aria-labelledby="comparison-heading">
      <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-[#455a75]">Comparison area</p>
      <h2 id="comparison-heading" className="m-0 text-[clamp(1.45rem,2.4vw,2rem)] tracking-[-0.035em]">Select two regions to compare.</h2>
      <p className="mt-2.5 leading-6 text-slate-500">Metric comparison will appear here.</p>
      {/* TODO: Render selected regions, requested data, metrics, and derived comparisons. */}
    </section>
  );
}
