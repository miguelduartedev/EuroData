import { useId, useMemo } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { Region } from "@/types/region";

export interface RegionSelectorProps {
  label: string;
  regions: Region[];
  value: string | undefined;
  onChange: (regionId: string | undefined) => void;
  accentColor?: string;
  unavailableRegionIds?: string[];
  disabled?: boolean;
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

function regionLabel(region: Region): string {
  return `${region.name}, ${region.countryName}`;
}

export function RegionSelector({
  label,
  regions,
  value,
  onChange,
  accentColor,
  unavailableRegionIds = [],
  disabled = false,
}: RegionSelectorProps) {
  const inputId = useId();
  const items = useMemo(
    () => Combobox.createItems(regions, { getValue: (region) => region.id, getLabel: regionLabel }),
    [regions],
  );

  return (
    <section className="w-full max-w-[290px] max-[720px]:max-w-none">
      <label htmlFor={inputId} className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#455a75] dark:text-slate-300">
        {accentColor ? <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: accentColor }} /> : null}
        {label}
      </label>
      <Combobox<string, false, Region>
        items={items}
        value={value ?? null}
        onValueChange={(regionId) => onChange(regionId ?? undefined)}
        filter={(region, query) => {
          const normalizedQuery = normalizeSearchValue(query.trim());
          return !normalizedQuery || [region.id, region.name, region.countryCode, region.countryName]
            .some((searchableValue) => normalizeSearchValue(searchableValue).includes(normalizedQuery));
        }}
        autoHighlight
        disabled={disabled}
      >
        <ComboboxInput
          id={inputId}
          aria-label={label}
          placeholder="Select region"
          showClear
          triggerLabel={`Show ${label} regions`}
          clearLabel={`Clear ${label} selection`}
          disabled={disabled}
          className="h-11 border-slate-300 bg-white text-slate-900 shadow-sm hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <ComboboxContent className="border border-slate-200 dark:border-slate-700">
          <ComboboxEmpty>No regions found.</ComboboxEmpty>
          <ComboboxList>
            {(region: Region) => (
              <ComboboxItem
                key={region.id}
                value={region.id}
                disabled={unavailableRegionIds.includes(region.id)}
                className="min-h-11 px-2.5 py-2"
              >
                <span className="min-w-0 flex-1 truncate">{regionLabel(region)}</span>
                <span className="text-xs text-muted-foreground">{region.id}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </section>
  );
}
