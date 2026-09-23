/** Keep a selected year when present; otherwise use the closest earlier available year. */
export function availableMetricYear(selectedYear: number, years: readonly number[]): number {
  if (!years.length) return selectedYear;
  if (years.includes(selectedYear)) return selectedYear;
  return [...years].filter((year) => year <= selectedYear).sort((a, b) => b - a)[0]
    ?? Math.max(...years);
}
