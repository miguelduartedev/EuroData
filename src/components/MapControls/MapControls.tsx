import { useId, useMemo } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { MetricDefinition, MetricId } from "@/types/metric";

export interface MapControlsProps {
  metrics: readonly MetricDefinition[];
  metricId: MetricId;
  onMetricChange: (metricId: MetricId) => void;
  years: readonly number[];
  year: number;
  onYearChange: (year: number) => void;
  yearStatus?: string;
}

function filterText(value: string, query: string): boolean {
  return value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

export function MapControls({
  metrics,
  metricId,
  onMetricChange,
  years,
  year,
  onYearChange,
  yearStatus,
}: MapControlsProps) {
  const metricInputId = useId();
  const yearInputId = useId();
  const regionLevelInputId = useId();
  const metricItems = useMemo(
    () => Combobox.createItems(metrics, {
      getValue: (metric) => metric.id,
      getLabel: (metric) => metric.label,
    }),
    [metrics],
  );
  const yearItems = useMemo(
    () => Combobox.createItems(years, {
      getValue: (availableYear) => String(availableYear),
      getLabel: (availableYear) => String(availableYear),
    }),
    [years],
  );
  const regionLevelItems = useMemo(
    () => Combobox.createItems(["nuts2"], {
      getValue: (level) => level,
      getLabel: () => "NUTS 2",
    }),
    [],
  );

  return (
    <section
      aria-label="Map controls"
      className="grid w-full gap-4 md:grid-cols-[minmax(0,1.45fr)_minmax(0,0.7fr)_minmax(0,1fr)]"
    >
      <div className="min-w-0">
        <label
          htmlFor={metricInputId}
          className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-[#455a75] dark:text-slate-300"
        >
          Metric
        </label>
        <Combobox<MetricId, false, MetricDefinition>
          items={metricItems}
          value={metricId}
          onValueChange={(value) => {
            if (value) onMetricChange(value);
          }}
          filter={(metric, query) => filterText(metric.label, query)}
          autoHighlight
        >
          <ComboboxInput
            id={metricInputId}
            aria-label="Metric"
            placeholder="Select metric"
            triggerLabel="Show Metric options"
            className="h-11 border-slate-300 bg-white text-slate-900 shadow-sm hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <ComboboxContent className="border border-slate-200 dark:border-slate-700">
            <ComboboxEmpty>No metrics found.</ComboboxEmpty>
            <ComboboxList>
              {(metric: MetricDefinition) => (
                <ComboboxItem key={metric.id} value={metric.id} className="min-h-11 px-2.5 py-2">
                  {metric.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      <div className="min-w-0">
        <label
          htmlFor={yearInputId}
          className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-[#455a75] dark:text-slate-300"
        >
          Year
        </label>
        <Combobox<string, false, number>
          items={yearItems}
          value={String(year)}
          onValueChange={(value) => {
            const selectedYear = Number(value);
            if (Number.isInteger(selectedYear)) onYearChange(selectedYear);
          }}
          filter={(availableYear, query) => filterText(String(availableYear), query)}
          autoHighlight
        >
          <ComboboxInput
            id={yearInputId}
            aria-label="Year"
            placeholder="Select year"
            triggerLabel="Show Year options"
            className="h-11 border-slate-300 bg-white text-slate-900 shadow-sm hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <ComboboxContent className="border border-slate-200 dark:border-slate-700">
            <ComboboxEmpty>No years found.</ComboboxEmpty>
            <ComboboxList>
              {(availableYear: number) => (
                <ComboboxItem
                  key={availableYear}
                  value={String(availableYear)}
                  className="min-h-11 px-2.5 py-2"
                >
                  {availableYear}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        {yearStatus ? (
          <p className="mt-1.5 text-xs text-muted-foreground" role="status">
            {yearStatus}
          </p>
        ) : null}
      </div>

      <div className="min-w-0">
        <label
          htmlFor={regionLevelInputId}
          className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#455a75] dark:text-slate-300"
        >
          Region level
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
            Coming soon
          </span>
        </label>
        <Combobox<string, false, string>
          items={regionLevelItems}
          value="nuts2"
          onValueChange={() => undefined}
          disabled
        >
          <ComboboxInput
            id={regionLevelInputId}
            aria-label="Region level"
            triggerLabel="Show Region level options"
            disabled
            className="h-11 border-slate-300 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </Combobox>
      </div>
    </section>
  );
}
