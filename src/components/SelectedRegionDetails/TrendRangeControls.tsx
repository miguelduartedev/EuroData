interface TrendRangeControlsProps {
  availableYears: readonly number[];
  fromYear: number | undefined;
  toYear: number | undefined;
  onFromYearChange: (year: number) => void;
  onToYearChange: (year: number) => void;
  isLoading: boolean;
}

export function TrendRangeControls({ availableYears, fromYear, toYear, onFromYearChange, onToYearChange, isLoading }: TrendRangeControlsProps) {
  if (isLoading) return <div aria-label="Loading trend range selectors" className="flex items-end gap-2">
    {["From", "To"].map((label) => <div key={label} className="grid gap-1 text-[10px] font-medium text-muted-foreground">
      <span>{label}</span>
      <span aria-hidden="true" className="h-7 w-14 animate-pulse rounded border border-border bg-muted motion-reduce:animate-none" />
    </div>)}
  </div>;

  return <div className="flex items-end gap-2">
    <label className="grid gap-1 text-[10px] font-medium text-muted-foreground">
      From
      <select
        aria-label="Trend start year"
        value={fromYear ?? ""}
        onChange={(event) => onFromYearChange(Number(event.target.value))}
        disabled={fromYear === undefined || toYear === undefined}
        className="h-7 cursor-pointer rounded border border-border bg-background px-1.5 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        {availableYears.filter((year) => toYear === undefined || year <= toYear).map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
    </label>
    <label className="grid gap-1 text-[10px] font-medium text-muted-foreground">
      To
      <select
        aria-label="Trend end year"
        value={toYear ?? ""}
        onChange={(event) => onToYearChange(Number(event.target.value))}
        disabled={fromYear === undefined || toYear === undefined}
        className="h-7 cursor-pointer rounded border border-border bg-background px-1.5 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        {availableYears.filter((year) => fromYear === undefined || year >= fromYear).map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
    </label>
  </div>;
}
