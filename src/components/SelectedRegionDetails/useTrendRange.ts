import { useEffect, useMemo, useState } from "react";
import { defaultTrendRangeForYears, type TrendRange } from "@/lib/metric-trend";

export function useTrendRange(availableYears: readonly number[], activeYear: number, resetKey: string) {
  const initialRange = useMemo(() => defaultTrendRangeForYears(availableYears, activeYear), [availableYears, activeYear]);
  const [selectedRange, setSelectedRange] = useState<TrendRange | null>(null);
  const range = selectedRange && availableYears.includes(selectedRange.fromYear) && availableYears.includes(selectedRange.toYear) && selectedRange.fromYear <= selectedRange.toYear
    ? selectedRange
    : initialRange;

  useEffect(() => {
    setSelectedRange(initialRange);
  }, [resetKey, activeYear, initialRange?.fromYear, initialRange?.toYear]);

  const setFromYear = (fromYear: number) => {
    if (!range || !availableYears.includes(fromYear)) return;
    setSelectedRange({ fromYear, toYear: Math.max(fromYear, range.toYear) });
  };

  const setToYear = (toYear: number) => {
    if (!range || !availableYears.includes(toYear)) return;
    setSelectedRange({ fromYear: Math.min(range.fromYear, toYear), toYear });
  };

  return { range, setFromYear, setToYear };
}
