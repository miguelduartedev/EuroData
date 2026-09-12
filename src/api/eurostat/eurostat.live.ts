import { describe, expect, it } from "vitest";
import { eurostatMetrics, getMetricHistory } from "./metrics";

const LIVE_REGION_IDS = ["FI1B", "SE11"];

describe("live Eurostat verification", () => {
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
