import { afterEach, expect, it, vi } from "vitest";
import {
  EurostatHttpError,
  EurostatNetworkError,
  EurostatResponseError,
  getEurostatDataset,
} from "./client";
import { EUROSTAT_START_YEAR, eurostatMetrics, getMetricHistory } from "./metrics";
import { sparseEurostatFixture } from "../../test/fixtures/eurostatJsonStat";

afterEach(() => {
  vi.unstubAllGlobals();
});

it.each([
  ["gdp_per_capita", "PPS per inhabitant"],
  ["unemployment_rate", "% of labour force"],
  ["gdp_growth", "% change on previous year"],
] as const)("normalizes %s with its configured unit", async (metricId, unit) => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => sparseEurostatFixture });
  vi.stubGlobal("fetch", fetchMock);

  const observations = await getMetricHistory(["FI1B", "FI1B", "SE11"], metricId);
  const requestedUrl = new URL(fetchMock.mock.calls[0][0]);

  expect(observations.every((observation) => observation.metricId === metricId && observation.unit === unit)).toBe(true);
  expect(requestedUrl.pathname).toContain(eurostatMetrics[metricId].datasetId);
  expect(requestedUrl.searchParams.getAll("geo")).toEqual(["FI1B", "SE11"]);
  expect(requestedUrl.searchParams.get("sinceTimePeriod")).toBe(String(EUROSTAT_START_YEAR));
  Object.entries(eurostatMetrics[metricId].filters).forEach(([key, value]) => {
    expect(requestedUrl.searchParams.get(key)).toBe(value);
  });
});

it("surfaces Eurostat HTTP failures with status context", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" }));

  await expect(getEurostatDataset("example", {})).rejects.toEqual(
    expect.objectContaining({ name: "EurostatHttpError", status: 503 }),
  );
  await expect(getEurostatDataset("example", {})).rejects.toBeInstanceOf(EurostatHttpError);
});

it("wraps network failures in a useful API error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network unavailable")));

  await expect(getEurostatDataset("example", {})).rejects.toBeInstanceOf(EurostatNetworkError);
});

it("rejects a malformed JSON response before parsing", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => null }));

  await expect(getEurostatDataset("example", {})).rejects.toBeInstanceOf(EurostatResponseError);
});
