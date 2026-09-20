import { expect, it } from "vitest";
import { EurostatResponseError } from "./client";
import { parseMetricObservations } from "./parser";
import { europeSnapshotFixture, sparseEurostatFixture } from "../../test/fixtures/eurostatJsonStat";

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

it.each(["sparse", "dense"])("normalizes a European snapshot with %s values and flags", (encoding) => {
  const dataset = encoding === "sparse" ? europeSnapshotFixture : {
    ...europeSnapshotFixture,
    value: [null, null, 0, 48800, 50400, null],
    status: [null, ":", null, "p", "e", null],
  };

  expect(parseMetricObservations(dataset, {
    metricId: "gdp_per_capita",
    unit: "PPS per inhabitant",
  })).toEqual([
    { regionId: "DE11", metricId: "gdp_per_capita", year: 2023, value: 0, unit: "PPS per inhabitant" },
    { regionId: "ES70", metricId: "gdp_per_capita", year: 2023, value: null, unit: "PPS per inhabitant", status: ":" },
    { regionId: "FI1B", metricId: "gdp_per_capita", year: 2023, value: 50400, unit: "PPS per inhabitant", status: "e" },
    { regionId: "PT1A", metricId: "gdp_per_capita", year: 2023, value: 48800, unit: "PPS per inhabitant", status: "p" },
    { regionId: "PTZZ", metricId: "gdp_per_capita", year: 2023, value: null, unit: "PPS per inhabitant" },
    { regionId: "SE11", metricId: "gdp_per_capita", year: 2023, value: null, unit: "PPS per inhabitant" },
  ]);
});
