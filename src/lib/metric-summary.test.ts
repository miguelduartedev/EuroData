import { expect, it } from "vitest";
import { summarizeMetric } from "./metric-summary";
import type { Observation } from "../types/metric";

const row = (regionId: string, value: number | null, extra: Partial<Observation> = {}): Observation => ({
  regionId, value, metricId: "gdp_per_capita", year: 2023, unit: "PPS per inhabitant", ...extra,
});
const selectableIds = new Set(["PT20", "FI1B", "DE11", "ES70", "SE11", "NO02"]);

it("summarizes unique valid regions in the selected metric/year, retaining zero", () => {
  const observations = [row("PT20", 10), row("FI1B", 40), row("PT20", 20), row("DE11", 0),
    row("ES70", null), row("SE11", NaN), row("NO02", Infinity),
    row("ES51", 500, { year: 2024 }), row("FR10", 900, { metricId: "gdp_growth" })];
  expect(summarizeMetric(observations, "gdp_per_capita", 2023, selectableIds)).toEqual({
    average: 20, count: 3, highest: { regionId: "FI1B", value: 40 }, lowest: { regionId: "DE11", value: 0 },
  });
});

it("resolves tied extrema by NUTS ID independent of input order", () => {
  const observations = [row("SE11", 20), row("FI1B", 20)];
  const result = summarizeMetric(observations, "gdp_per_capita", 2023, selectableIds);
  expect(result.highest?.regionId).toBe("FI1B");
  expect(result.lowest?.regionId).toBe("FI1B");
  expect(summarizeMetric([...observations].reverse(), "gdp_per_capita", 2023, selectableIds)).toEqual(result);
});

it.each([{ observations: [] }, { observations: [row("PT20", null), row("DE11", undefined as unknown as number)] }])("handles no valid data", ({ observations }) => {
  expect(summarizeMetric(observations, "gdp_per_capita", 2023, selectableIds)).toEqual({ average: null, highest: null, lowest: null, count: 0 });
});

it("excludes numeric dataset-only IDs from map-facing extrema, average and count", () => {
  const observations = [
    row("FI1B", 40), row("PT20", 20), row("ES70", null), row("FIZZ", 900), row("NLZZ", -200),
  ];
  const result = summarizeMetric(observations, "gdp_per_capita", 2023, new Set(["FI1B", "PT20", "ES70"]));
  expect(result).toEqual({
    average: 30, count: 2, highest: { regionId: "FI1B", value: 40 }, lowest: { regionId: "PT20", value: 20 },
  });
  expect(observations).toEqual([
    row("FI1B", 40), row("PT20", 20), row("ES70", null), row("FIZZ", 900), row("NLZZ", -200),
  ]);
});
