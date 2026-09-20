/// <reference types="node" />

import { readFile } from "node:fs/promises";
import type { FeatureCollection } from "geojson";
import { describe, expect, it } from "vitest";
import { buildEurostatDatasetUrl } from "./client";
import { EUROSTAT_SNAPSHOT_YEAR, eurostatMetrics, getMetricHistory, getNuts2MetricSnapshot } from "./metrics";

const LIVE_REGION_IDS = ["FI1B", "SE11"];

describe("live Eurostat verification", () => {
  it("returns a Europe-wide GDP snapshot and reports GISCO coverage", async () => {
    const observations = await getNuts2MetricSnapshot("gdp_per_capita");
    const metric = eurostatMetrics.gdp_per_capita;
    const geometry: FeatureCollection = JSON.parse(await readFile(
      new URL("../../../public/data/europe-nuts-2-2024.geojson", import.meta.url), "utf8",
    ));
    const geometryIds = new Set(geometry.features.map((feature) => feature.properties?.NUTS_ID as string));
    const observationIds = new Set(observations.map(({ regionId }) => regionId));
    const samples = ["PT1A", "ES70", "FI1B", "SE11", "DE11"].map((id) =>
      observations.find(({ regionId }) => regionId === id),
    );

    expect(observations.length).toBeGreaterThan(0);
    expect(observationIds.size).toBe(observations.length);
    expect(observations.every(({ year, metricId, unit, value }) =>
      year === EUROSTAT_SNAPSHOT_YEAR && metricId === "gdp_per_capita" && unit === metric.unit &&
      (value === null || Number.isFinite(value)),
    )).toBe(true);
    samples.forEach((sample) => {
      expect(sample).toBeDefined();
      expect(typeof sample?.value).toBe("number");
    });
    expect(observations.some(({ regionId }) => regionId.startsWith("UK"))).toBe(false);

    console.info(JSON.stringify({
      request: buildEurostatDatasetUrl(metric.datasetId, {
        ...metric.filters, geoLevel: "nuts2", time: String(EUROSTAT_SNAPSHOT_YEAR),
      }).toString(),
      total: observations.length,
      numeric: observations.filter(({ value }) => value !== null).length,
      missing: observations.filter(({ value }) => value === null).length,
      flagged: observations.filter(({ status }) => status !== undefined).length,
      samples,
      geometryMatches: observations.filter(({ regionId }) => geometryIds.has(regionId)).length,
      datasetOnly: [...observationIds].filter((id) => !geometryIds.has(id)).sort(),
      geometryOnly: [...geometryIds].filter((id) => !observationIds.has(id)).sort(),
    }, null, 2));
  });

  it.each(Object.keys(eurostatMetrics) as Array<keyof typeof eurostatMetrics>)(
    "returns an annual series for %s",
    async (metricId) => {
      const observations = await getMetricHistory(LIVE_REGION_IDS, metricId);

      expect(observations.some((observation) => observation.regionId === "FI1B")).toBe(true);
      expect(observations.some((observation) => observation.regionId === "SE11")).toBe(true);
      expect(observations.every((observation) => Number.isInteger(observation.year))).toBe(true);
      expect(observations.every((observation) => observation.value === null || typeof observation.value === "number")).toBe(true);
      const fi1bObservations = observations.filter((observation) => observation.regionId === "FI1B");
      expect(new Set(fi1bObservations.map((observation) => observation.year)).size).toBeGreaterThan(1);

      const latestYear = Math.max(...fi1bObservations.map((observation) => observation.year));
      console.info(`${metricId}: FI1B has ${fi1bObservations.length} annual observations through ${latestYear}.`);
    },
  );
});
