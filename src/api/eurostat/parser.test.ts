import { expect, it } from "vitest";
import { EurostatResponseError } from "./client";
import { parseMetricObservations } from "./parser";
import { sparseEurostatFixture } from "../../test/fixtures/eurostatJsonStat";

it("maps sparse JSON-stat values to the correct geography and year without losing zero", () => {
  expect(parseMetricObservations(sparseEurostatFixture, {
    metricId: "gdp_per_capita",
    unit: "PPS per inhabitant",
  })).toEqual([
    { regionId: "FI1B", metricId: "gdp_per_capita", year: 2015, value: 108, unit: "PPS per inhabitant" },
    { regionId: "FI1B", metricId: "gdp_per_capita", year: 2016, value: 0, unit: "PPS per inhabitant", status: "e" },
    { regionId: "SE11", metricId: "gdp_per_capita", year: 2015, value: null, unit: "PPS per inhabitant" },
    { regionId: "SE11", metricId: "gdp_per_capita", year: 2016, value: 115, unit: "PPS per inhabitant" },
  ]);
});

it("rejects malformed JSON-stat responses", () => {
  expect(() => parseMetricObservations({} as never, {
    metricId: "gdp_per_capita",
    unit: "PPS per inhabitant",
  })).toThrow(EurostatResponseError);
});
