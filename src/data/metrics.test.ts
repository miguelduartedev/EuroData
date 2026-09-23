import { expect, it } from "vitest";
import { createExpression } from "@maplibre/maplibre-gl-style-spec";
import { EUROSTAT_ORANGE_BLUE_6, getMetricDefinition, metricRegistry, metrics } from "./metrics";
import { choroplethBand, choroplethExpression, choroplethLegend, NO_DATA_COLORS } from "../lib/choropleth";

it("exposes exactly the seven supported metrics from one registry", () => {
  expect(metrics.map(({ id, label }) => [id, label])).toEqual([
    ["gdp_per_capita", "GDP per capita (PPS)"],
    ["gdp_per_capita_eur", "GDP per capita (EUR)"],
    ["gdp_growth", "Real GDP growth"],
    ["unemployment_rate", "Unemployment rate"],
    ["employment_rate", "Employment rate"],
    ["population", "Population"],
    ["population_growth", "Population growth"],
  ]);
  expect(metrics.map(({ id }) => id)).toEqual(Object.keys(metricRegistry));
  expect(getMetricDefinition("unemployment_rate")).toMatchObject({ rankDirection: "lower", periodChange: "percentagePoints", valueFormat: "percent" });
  expect(getMetricDefinition("gdp_growth")).toMatchObject({ rankDirection: "higher", periodChange: "percentagePoints", valueFormat: "percent" });
  expect(getMetricDefinition("employment_rate")).toMatchObject({
    eurostat: { datasetId: "lfst_r_lfe2emprt", filters: { freq: "A", sex: "T", age: "Y20-64", unit: "PC" } },
    unit: "% of population aged 20–64", rankDirection: "higher", periodChange: "percentagePoints", valueFormat: "percent",
  });
  expect(getMetricDefinition("population")).toMatchObject({
    eurostat: { datasetId: "demo_r_d2jan", filters: { freq: "A", sex: "T", age: "TOTAL", unit: "NR" } },
    unit: "people", rankDirection: "higher", periodChange: "relative", valueFormat: "number",
  });
  expect(getMetricDefinition("population_growth")).toMatchObject({
    derivation: "annualPercentChange", sourceMetricId: "population", sourceUnit: "people",
    unit: "% change on previous year", rankDirection: "higher", periodChange: "percentagePoints", valueFormat: "percent",
  });
});

it.each(metrics)("keeps $id map colours and legend synchronized at every threshold", (metric) => {
  const { choropleth: scale, valueFormat } = metric;
  const legend = choroplethLegend(scale, valueFormat);
  expect(legend).toHaveLength(scale.thresholds.length + 1);
  expect(legend.map(({ color }) => color)).toEqual(scale.colors);
  const expression = createExpression(choroplethExpression(scale, NO_DATA_COLORS.light), "fill-color");
  expect(expression.result).toBe("success");
  if (expression.result !== "success") return;
  for (const value of [-30, 0, 100_000, ...scale.thresholds.flatMap((threshold) => [threshold - 0.1, threshold, threshold + 0.1])]) {
    const band = choroplethBand(value, scale);
    expect(band).not.toBeNull();
    expect(expression.value.evaluate({ zoom: 3 }, { type: 3, properties: { metricValue: value } })).toBe(legend[band!].color);
  }
  expect(expression.value.evaluate({ zoom: 3 }, { type: 3, properties: { metricValue: null } })).toBe(NO_DATA_COLORS.light);
});

it("places negative growth, zero growth and positive growth in diverging bands", () => {
  const scale = getMetricDefinition("gdp_growth").choropleth;
  expect(scale.thresholds).toEqual([-5, -2, -0.5, 0.5, 2, 5]);
  expect(choroplethBand(-5, scale)).toBe(1);
  expect(choroplethBand(0, scale)).toBe(3);
  expect(choroplethBand(5, scale)).toBe(6);
  expect(scale.colors).toEqual([
    "#D96D24", "#F0B956", "#C8D8EC", "#C8D8EC", "#809BC9", "#5878B5", "#3559A0",
  ]);
  expect(choroplethLegend(scale, "percent")[3]).toEqual({ color: "#C8D8EC", label: "-0.5%–<0.5%" });
});

it("uses the Eurostat orange-to-blue palette in semantic metric order", () => {
  expect(EUROSTAT_ORANGE_BLUE_6).toEqual([
    "#D96D24", "#F0B956", "#C8D8EC", "#809BC9", "#5878B5", "#3559A0",
  ]);
  expect(getMetricDefinition("gdp_per_capita").choropleth.colors).toEqual(EUROSTAT_ORANGE_BLUE_6);
  expect(getMetricDefinition("gdp_per_capita_eur").choropleth.colors).toEqual(EUROSTAT_ORANGE_BLUE_6);
  expect(getMetricDefinition("unemployment_rate").choropleth.colors).toEqual([...EUROSTAT_ORANGE_BLUE_6].reverse());
  expect(getMetricDefinition("employment_rate").choropleth).toEqual({
    thresholds: [60, 70, 75, 80, 84], colors: EUROSTAT_ORANGE_BLUE_6,
  });
  expect(getMetricDefinition("population").choropleth).toEqual({
    thresholds: [500_000, 900_000, 1_500_000, 2_500_000, 4_000_000], colors: EUROSTAT_ORANGE_BLUE_6,
  });
  expect(getMetricDefinition("population_growth").choropleth).toEqual({
    thresholds: [-1, -0.25, 0, 0.25, 1], colors: EUROSTAT_ORANGE_BLUE_6,
  });
  expect(choroplethBand(-6, getMetricDefinition("gdp_growth").choropleth)).toBe(0);
  expect(choroplethBand(6, getMetricDefinition("gdp_growth").choropleth)).toBe(6);
});
