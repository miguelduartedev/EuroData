import { metricRegistry } from "./metrics";

/** Compatibility export for map tests; the scale itself is owned by the metric registry. */
export const gdpChoroplethScale = metricRegistry.gdp_per_capita.choropleth;
