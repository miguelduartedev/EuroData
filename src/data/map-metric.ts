import type { ChoroplethScale } from "../lib/choropleth";

/** Readable bands from the 2023 distribution; see the Eurostat API README. */
export const gdpChoroplethScale: ChoroplethScale = {
  thresholds: [20_000, 30_000, 40_000, 50_000, 70_000],
  colors: ["#deebf7", "#bdd7e7", "#6baed6", "#3182bd", "#087e8b", "#06515b"],
};
