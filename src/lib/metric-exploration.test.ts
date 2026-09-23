import { expect, it } from "vitest";
import { getMetricDefinition } from "@/data/metrics";
import { choroplethLegend } from "./choropleth";
import { exploreRegions, mapComparableRegionValues, metricDistribution } from "./metric-exploration";
import type { Observation } from "@/types/metric";

const metric = getMetricDefinition("gdp_per_capita");
const observations: Observation[] = [
  { regionId: "FI1B", metricId: "gdp_per_capita", year: 2024, value: 50_000, unit: metric.unit },
  { regionId: "PT20", metricId: "gdp_per_capita", year: 2024, value: 19_000, unit: metric.unit },
  { regionId: "ES51", metricId: "gdp_per_capita", year: 2024, value: 30_000, unit: metric.unit },
  { regionId: "NLZZ", metricId: "gdp_per_capita", year: 2024, value: 90_000, unit: metric.unit },
  { regionId: "SE11", metricId: "gdp_per_capita", year: 2024, value: null, unit: metric.unit },
  { regionId: "DE11", metricId: "gdp_per_capita", year: 2023, value: 70_000, unit: metric.unit },
];
const selectableIds = new Set(["FI1B", "PT20", "ES51", "SE11"]);

it("groups only numeric GISCO-backed values into the active choropleth bands", () => {
  const values = mapComparableRegionValues(observations, "gdp_per_capita", 2024, selectableIds);
  const distribution = metricDistribution(values, metric.choropleth, metric.valueFormat);

  expect(values).toEqual([
    { regionId: "FI1B", value: 50_000 },
    { regionId: "PT20", value: 19_000 },
    { regionId: "ES51", value: 30_000 },
  ]);
  expect(distribution.map(({ count }) => count)).toEqual([1, 0, 1, 0, 1, 0]);
  expect(distribution.map(({ label, color }) => ({ label, color }))).toEqual(
    choroplethLegend(metric.choropleth, metric.valueFormat),
  );
});

it("sorts the selectable numeric population by actual highest or lowest value", () => {
  const values = mapComparableRegionValues(observations, "gdp_per_capita", 2024, selectableIds);
  expect(exploreRegions(values, "highest").map(({ regionId }) => regionId)).toEqual(["FI1B", "ES51", "PT20"]);
  expect(exploreRegions(values, "lowest").map(({ regionId }) => regionId)).toEqual(["PT20", "ES51", "FI1B"]);
});

it("uses each metric's configured diverging or reversed scale without separate thresholds", () => {
  const growth = getMetricDefinition("gdp_growth");
  const unemployment = getMetricDefinition("unemployment_rate");
  expect(metricDistribution([{ regionId: "FI1B", value: -5 }], growth.choropleth, growth.valueFormat)[0].color)
    .toBe(growth.choropleth.colors[0]);
  expect(metricDistribution([{ regionId: "FI1B", value: 3 }], unemployment.choropleth, unemployment.valueFormat)[1].color)
    .toBe(unemployment.choropleth.colors[1]);
});
