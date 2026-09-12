export function MetricTrend() {
  return (
    <section className="rounded-lg border border-t-4 border-[#dbe3ed] border-t-blue-600 bg-white p-6" aria-labelledby="trend-heading">
      <h2 id="trend-heading" className="m-0 text-[clamp(1.45rem,2.4vw,2rem)] tracking-[-0.035em]">Historical trend</h2>
      <p className="mt-2.5 leading-6 text-slate-500">Choose how to present historical metric data during the exercise.</p>
      {/* TODO: Add metric selection and a historical data representation. */}
    </section>
  );
}
