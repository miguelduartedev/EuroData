import { choroplethLegend, type MapMetric } from "../../lib/choropleth";

export function MapLegend({ metric, noDataColor }: { metric: MapMetric; noDataColor: string }) {
  return (
    <section aria-label="Map legend" className="absolute left-3 top-3 z-10 max-w-[calc(100%-4rem)] rounded-lg border border-border bg-card p-3 text-xs text-card-foreground shadow-sm">
      <h2 className="text-xs font-semibold">{metric.label} · {metric.year}</h2>
      <p className="mb-2 mt-0.5 text-[11px] text-muted-foreground">{metric.unit}</p>
      <ul className="grid gap-1">
        {[...choroplethLegend(metric.scale, metric.valueFormat), { label: "No data", color: noDataColor }].map(({ label, color }) => (
          <li key={label} className="flex items-center gap-2">
            <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span>{label}</span>
          </li>
        ))}
      </ul>
      {(metric.isLoading || metric.isError) && (
        <p role="status" className="mt-2 max-w-44 text-[11px] text-muted-foreground">
          {metric.isError
            ? metric.values.size > 0 ? "Could not refresh data. Showing cached values." : "Data unavailable. You can still explore the map."
            : "Loading data…"}
        </p>
      )}
    </section>
  );
}
