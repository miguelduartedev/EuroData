import { afterEach, expect, it, vi } from "vitest";
import {
  EurostatHttpError,
  EurostatNetworkError,
  EurostatResponseError,
  getEurostatDataset,
} from "./client";
import {
  eurostatMetrics,
  getMetricHistory,
  getNuts2MetricSnapshot,
  getNuts2MetricYears,
} from "./metrics";
import { europeSnapshotFixture, sparseEurostatFixture } from "../../test/fixtures/eurostatJsonStat";

afterEach(() => {
  vi.unstubAllGlobals();
});

it.each([undefined, 2022])("requests all NUTS 2 GDP observations for year %s", async (year) => {
  const expectedYear = year ?? 2023;
  const dataset = {
    ...europeSnapshotFixture,
    dimension: {
      ...europeSnapshotFixture.dimension,
      time: { category: { index: { [expectedYear]: 0 } } },
    },
  };
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => dataset });
  vi.stubGlobal("fetch", fetchMock);

  const observations = await getNuts2MetricSnapshot("gdp_per_capita", year);
  const requestedUrl = new URL(fetchMock.mock.calls[0][0]);

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(requestedUrl.pathname).toBe("/eurostat/api/dissemination/statistics/1.0/data/nama_10r_2gdp");
  expect(Object.fromEntries(requestedUrl.searchParams)).toEqual({
    freq: "A", unit: "PPS_EU27_2020_HAB", geoLevel: "nuts2", time: String(expectedYear),
  });
  expect(observations.map(({ regionId }) => regionId)).toEqual(["DE11", "ES70", "FI1B", "PT1A", "PTZZ", "SE11"]);
  expect(observations.every((observation) =>
    observation.year === expectedYear && observation.metricId === "gdp_per_capita" && observation.unit === "PPS per inhabitant",
  )).toBe(true);
  expect(observations.find(({ regionId }) => regionId === "PTZZ")?.value).toBeNull();
  expect(observations.find(({ regionId }) => regionId === "ES70")).toMatchObject({ value: null, status: ":" });
  expect(observations.find(({ regionId }) => regionId === "FI1B")).toMatchObject({ value: 50400, status: "e" });
});

it("requests every available NUTS 2 GDP year without a time filter", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => sparseEurostatFixture });
  vi.stubGlobal("fetch", fetchMock);

  await expect(getNuts2MetricYears("gdp_per_capita")).resolves.toEqual([2016, 2015]);

  const requestedUrl = new URL(fetchMock.mock.calls[0][0]);
  expect(Object.fromEntries(requestedUrl.searchParams)).toEqual({
    freq: "A", unit: "PPS_EU27_2020_HAB", geoLevel: "nuts2",
  });
  expect(requestedUrl.searchParams.has("time")).toBe(false);
});

it("returns only years with at least one numeric regional observation", async () => {
  const dataset = {
    ...sparseEurostatFixture,
    size: [3, 1, 2, 1],
    dimension: {
      ...sparseEurostatFixture.dimension,
      time: { category: { index: { "2016": 0, "2015": 1, "2017": 2 } } },
    },
  };
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => dataset });
  vi.stubGlobal("fetch", fetchMock);

  await expect(getNuts2MetricYears("gdp_per_capita")).resolves.toEqual([2016, 2015]);
});

it.each([
  ["gdp_per_capita", "PPS per inhabitant"],
  ["gdp_per_capita_eur", "EUR per inhabitant"],
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
  expect(requestedUrl.searchParams.has("sinceTimePeriod")).toBe(false);
  Object.entries(eurostatMetrics[metricId].filters).forEach(([key, value]) => {
    expect(requestedUrl.searchParams.get(key)).toBe(value);
  });
});

it.each([
  ["gdp_per_capita", "nama_10r_2gdp", { freq: "A", unit: "PPS_EU27_2020_HAB" }],
  ["gdp_per_capita_eur", "nama_10r_2gdp", { freq: "A", unit: "EUR_HAB" }],
  ["gdp_growth", "nama_10r_2gvagr", { freq: "A", na_item: "B1GQ", unit: "PCH_PRE" }],
  ["unemployment_rate", "lfst_r_lfu3rt", { freq: "A", isced11: "TOTAL", sex: "T", age: "Y15-74", unit: "PC" }],
] as const)("requests %s from its configured dataset and filters", async (metricId, datasetId, filters) => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => europeSnapshotFixture });
  vi.stubGlobal("fetch", fetchMock);

  await getNuts2MetricSnapshot(metricId, 2023);
  const url = new URL(fetchMock.mock.calls[0][0]);
  expect(url.pathname).toContain(`/data/${datasetId}`);
  expect(Object.fromEntries(url.searchParams)).toEqual({ ...filters, geoLevel: "nuts2", time: "2023" });
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
