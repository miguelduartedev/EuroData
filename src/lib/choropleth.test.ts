import { createExpression } from "@maplibre/maplibre-gl-style-spec";
import type { FeatureCollection, Polygon } from "geojson";
import { expect, it } from "vitest";
import { gdpChoroplethScale as scale } from "../data/map-metric";
import { getMetricDefinition } from "../data/metrics";
import type { Observation } from "../types/metric";
import {
  buildMetricLookup, choroplethBand, choroplethExpression, choroplethLegend,
  joinMetricToGeometry, metricHoverText, NO_DATA_COLORS, type MapMetric,
} from "./choropleth";

const metric: MapMetric = {
  values: new Map(), label: "GDP per capita", unit: "PPS per inhabitant", year: 2023,
  scale, isLoading: false, isError: false,
};

it("joins by NUTS ID without mutating geometry or losing islands, zero or no-data regions", () => {
  const observations: Observation[] = [
    { regionId: "FI1B", metricId: "gdp_per_capita", year: 2023, value: 50400, unit: metric.unit },
    { regionId: "PT20", metricId: "gdp_per_capita", year: 2023, value: 0, unit: metric.unit },
    { regionId: "ES70", metricId: "gdp_per_capita", year: 2023, value: null, unit: metric.unit },
    { regionId: "PT30", metricId: "gdp_per_capita", year: 2023, value: Infinity, unit: metric.unit },
    { regionId: "ES53", metricId: "gdp_per_capita", year: 2023, value: NaN, unit: metric.unit },
    { regionId: "FI1B", metricId: "gdp_per_capita", year: 2022, value: 1, unit: metric.unit },
    { regionId: "FI1B", metricId: "unemployment_rate", year: 2023, value: 2, unit: "%" },
    { regionId: "PTZZ", metricId: "gdp_per_capita", year: 2023, value: null, unit: metric.unit },
  ];
  const geometry: FeatureCollection<Polygon> = {
    type: "FeatureCollection", features: ["FI1B", "PT20", "ES70", "PT30", "ES53", "IS00"].map((id) => ({
      type: "Feature", properties: { NUTS_ID: id, NAME_LATN: id },
      geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [0, 1], [0, 0]]] },
    })),
  };
  const original = structuredClone(geometry);
  geometry.features.forEach((feature) => { Object.freeze(feature.properties); Object.freeze(feature); });
  const lookup = buildMetricLookup(observations, "gdp_per_capita", 2023);
  const joined = joinMetricToGeometry(geometry, lookup);

  expect(lookup.get("FI1B")).toBe(50400);
  expect(lookup.has("PTZZ")).toBe(true);
  expect(joined.features.map((feature) => feature.properties?.metricValue)).toEqual([50400, 0, null, null, null, null]);
  expect(joined.features.map((feature) => feature.properties?.NUTS_ID)).toEqual(["FI1B", "PT20", "ES70", "PT30", "ES53", "IS00"]);
  expect(geometry).toEqual(original);
  expect(joined).not.toBe(geometry);
  expect(joined.features[0]).not.toBe(geometry.features[0]);
  expect(joined.features[0].properties).not.toBe(geometry.features[0].properties);
  expect(joined.features[0].geometry).toBe(geometry.features[0].geometry);
});

it("evaluates MapLibre colours consistently with the legend at every boundary", () => {
  const expression = createExpression(choroplethExpression(scale, NO_DATA_COLORS.light), "fill-color");
  expect(expression.result).toBe("success");
  if (expression.result !== "success") throw new Error(JSON.stringify(expression.value));
  const legend = choroplethLegend(scale);
  expect(legend.map(({ label }) => label)).toEqual([
    "<20,000", "20,000–<30,000", "30,000–<40,000", "40,000–<50,000", "50,000–<70,000", "≥70,000",
  ]);
  for (const value of [0, 10100, ...scale.thresholds.flatMap((threshold) => [threshold - 1, threshold, threshold + 1]), 96300]) {
    const band = choroplethBand(value, scale)!;
    const color = expression.value.evaluate({ zoom: 3 }, { type: 3, properties: { metricValue: value } });
    expect(color).toBe(legend[band].color);
    const expectedBand = scale.thresholds.filter((threshold) => value >= threshold).length;
    expect(band).toBe(expectedBand);
  }
  for (const properties of [{ metricValue: null }, {}]) {
    expect(expression.value.evaluate({ zoom: 3 }, { type: 3, properties })).toBe(NO_DATA_COLORS.light);
  }
  for (const value of [null, undefined, Infinity, NaN]) expect(choroplethBand(value, scale)).toBeNull();
});

it("formats hover names, values and missing data without implying euros or zero", () => {
  const populated = { ...metric, values: new Map<string, number | null>([["FI1B", 50400], ["PT20", 0], ["ES70", null]]) };
  expect(metricHoverText({ NUTS_ID: "FI1B", NAME_LATN: "Helsinki-Uusimaa" }, populated)).toEqual([
    "Helsinki-Uusimaa (FI1B)", "50,400", "PPS per inhabitant · 2023",
  ]);
  expect(metricHoverText({ NUTS_ID: "PT20", NUTS_NAME: "Azores" }, populated)).toEqual(["Azores (PT20)", "0", "PPS per inhabitant · 2023"]);
  for (const id of ["ES70", "IS00"]) expect(metricHoverText({ NUTS_ID: id }, populated)[1]).toBe("No data");
});

it("formats EUR and percentage hover values with their configured units", () => {
  for (const [metricId, value, formatted] of [
    ["gdp_per_capita_eur", 42000, "€42,000"],
    ["gdp_growth", -2.4, "-2.4%"],
    ["unemployment_rate", 0, "0%"],
  ] as const) {
    const definition = getMetricDefinition(metricId);
    expect(metricHoverText({ NUTS_ID: "FI1B" }, {
      ...metric, values: new Map([["FI1B", value]]), label: definition.label,
      unit: definition.unit, valueFormat: definition.valueFormat,
    })).toEqual(["FI1B", formatted, `${definition.unit} · 2023`]);
  }
});
