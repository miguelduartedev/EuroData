import { expect, it } from "vitest";
import { changeOverPeriod, defaultTrendRange, filterTrendRange, metricDifference, metricRank, selectableTrendYears, sharedSelectableTrendYears, trendPoints } from "./metric-trend";
import type { Observation } from "../types/metric";

const row = (year: number, value: number | null, regionId = "FI1B"): Observation => ({
  regionId, metricId: "gdp_per_capita", year, value, unit: "PPS per inhabitant",
});
const selectableIds = new Set(["FI1B", "SE11", "PT20"]);

it("sorts a region's complete history by year and retains gaps", () => {
  expect(trendPoints([row(2023, 30), row(2015, 20), row(2020, null), row(2024, 40)], "FI1B", "gdp_per_capita")).toEqual([
    { year: 2015, value: 20 }, { year: 2020, value: null }, { year: 2023, value: 30 }, { year: 2024, value: 40 },
  ]);
});

it("derives numeric range endpoints and filters sparse series without filling gaps", () => {
  const points = [{ year: 2010, value: 10 }, { year: 2013, value: 20 }, { year: 2015, value: null }, { year: 2023, value: 30 }];
  expect(selectableTrendYears(points)).toEqual([2010, 2013, 2023]);
  expect(defaultTrendRange(points, 2023)).toEqual({ fromYear: 2013, toYear: 2023 });
  expect(filterTrendRange(points, { fromYear: 2013, toYear: 2023 })).toEqual([
    { year: 2013, value: 20 }, { year: 2015, value: null }, { year: 2023, value: 30 },
  ]);
});

it("uses the earliest observation when a sparse series has no value near ten years before its end", () => {
  expect(defaultTrendRange([{ year: 2010, value: 10 }, { year: 2023, value: 20 }], 2023)).toEqual({ fromYear: 2010, toYear: 2023 });
});

it("derives shared endpoints from years where both regions have numeric values", () => {
  expect(sharedSelectableTrendYears(
    [{ year: 2013, value: 10 }, { year: 2019, value: null }, { year: 2023, value: 20 }],
    [{ year: 2013, value: 8 }, { year: 2019, value: 9 }, { year: 2023, value: 12 }],
  )).toEqual([2013, 2023]);
});

it("calculates directional current-value differences safely", () => {
  expect(metricDifference(50000, 25000)).toEqual({ value: 25000, percent: 100 });
  expect(metricDifference(25000, 50000)).toEqual({ value: -25000, percent: -50 });
  expect(metricDifference(null, 25000)).toBeNull();
  expect(metricDifference(10, 0)).toEqual({ value: 10, percent: null });
});

it("calculates positive and negative change while omitting unsafe periods", () => {
  expect(changeOverPeriod([{ year: 2015, value: 20 }, { year: 2023, value: 25 }])).toEqual({ value: 25, sinceYear: 2015 });
  expect(changeOverPeriod([{ year: 2015, value: 20 }, { year: 2023, value: 10 }])).toEqual({ value: -50, sinceYear: 2015 });
  expect(changeOverPeriod([{ year: 2015, value: null }, { year: 2023, value: 10 }])).toBeNull();
  expect(changeOverPeriod([{ year: 2015, value: 0 }, { year: 2023, value: 10 }])).toBeNull();
});

it("calculates rate changes in percentage points, including a zero baseline", () => {
  expect(changeOverPeriod([{ year: 2015, value: 8.5 }, { year: 2023, value: 5.2 }], "percentagePoints"))
    .toEqual({ value: -3.3, sinceYear: 2015 });
  expect(changeOverPeriod([{ year: 2015, value: 0 }, { year: 2023, value: 2 }], "percentagePoints"))
    .toEqual({ value: 2, sinceYear: 2015 });
});

it("ranks valid snapshot observations only, with configurable direction", () => {
  const snapshot = [row(2023, 20, "FI1B"), row(2023, 30, "SE11"), row(2023, null, "PT20"), row(2023, NaN, "DE11")];
  expect(metricRank(snapshot, "gdp_per_capita", 2023, "FI1B", "higher", selectableIds)).toEqual({ position: 2, total: 2 });
  expect(metricRank(snapshot, "gdp_per_capita", 2023, "FI1B", "lower", selectableIds)).toEqual({ position: 1, total: 2 });
  expect(metricRank(snapshot, "gdp_per_capita", 2023, "PT20", "higher", selectableIds)).toBeNull();
});

it("ranks unemployment low-first and growth high-first while excluding missing data", () => {
  const observations: Observation[] = [
    { regionId: "FI1B", metricId: "unemployment_rate", year: 2023, value: 3, unit: "% of labour force" },
    { regionId: "PT20", metricId: "unemployment_rate", year: 2023, value: 8, unit: "% of labour force" },
    { regionId: "SE11", metricId: "unemployment_rate", year: 2023, value: null, unit: "% of labour force" },
    { regionId: "FI1B", metricId: "gdp_growth", year: 2023, value: -2, unit: "% change on previous year" },
    { regionId: "PT20", metricId: "gdp_growth", year: 2023, value: 1, unit: "% change on previous year" },
  ];
  expect(metricRank(observations, "unemployment_rate", 2023, "FI1B", "lower", selectableIds)).toEqual({ position: 1, total: 2 });
  expect(metricRank(observations, "gdp_growth", 2023, "PT20", "higher", selectableIds)).toEqual({ position: 1, total: 2 });
});

it("excludes numeric dataset-only IDs from ranking and its denominator", () => {
  const observations = [row(2023, 40, "FI1B"), row(2023, 20, "PT20"), row(2023, 999, "FIZZ"), row(2023, null, "SE11")];
  const ids = new Set(["FI1B", "PT20", "SE11"]);
  expect(metricRank(observations, "gdp_per_capita", 2023, "FI1B", "higher", ids)).toEqual({ position: 1, total: 2 });
  expect(metricRank(observations, "gdp_per_capita", 2023, "FIZZ", "higher", ids)).toBeNull();
});
