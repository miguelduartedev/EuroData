import { expect, it } from "vitest";
import { metricDifference } from "../lib/metric-trend";

it("renders the starter test environment", () => {
  expect(metricDifference(30, 20)).toEqual({ value: 10, percent: 50 });
});
