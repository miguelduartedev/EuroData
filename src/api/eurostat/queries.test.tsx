import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { europeSnapshotFixture } from "../../test/fixtures/eurostatJsonStat";
import { EurostatHttpError } from "./client";
import { useNuts2MetricSnapshot, useNuts2MetricYears, useRegionMetricHistory } from "./queries";

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  vi.stubGlobal("fetch", vi.fn(async (url: URL) => ({
    ok: true,
    json: async () => ({
      ...europeSnapshotFixture,
      size: [url.searchParams.has("time") ? 1 : 2, ...europeSnapshotFixture.size.slice(1)],
      dimension: {
        ...europeSnapshotFixture.dimension,
        time: {
          category: {
            index: url.searchParams.has("time")
              ? { [url.searchParams.get("time")!]: 0 }
              : { "2024": 0, "2023": 1 },
          },
        },
        unit: { category: { index: { [url.searchParams.get("unit")!]: 0 } } },
      },
    }),
  })));
});

afterEach(() => {
  cleanup();
  queryClient.clear();
  vi.unstubAllGlobals();
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

it("shares concurrent requests and reuses a fresh snapshot on remount", async () => {
  const first = renderHook(() => useNuts2MetricSnapshot("gdp_per_capita"), { wrapper });
  const second = renderHook(() => useNuts2MetricSnapshot("gdp_per_capita", 2023), { wrapper });

  await waitFor(() => expect(first.result.current.isSuccess && second.result.current.isSuccess).toBe(true));
  expect(first.result.current.data).toBe(second.result.current.data);
  const cachedData = first.result.current.data;
  first.unmount();
  second.unmount();

  const remounted = renderHook(() => useNuts2MetricSnapshot("gdp_per_capita"), { wrapper });
  expect(remounted.result.current.data).toBe(cachedData);
  expect(remounted.result.current.isStale).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("keeps different metric and year snapshots in separate cache entries", async () => {
  const snapshots = renderHook(() => ({
    gdp: useNuts2MetricSnapshot("gdp_per_capita"),
    previousGdp: useNuts2MetricSnapshot("gdp_per_capita", 2022),
    unemployment: useNuts2MetricSnapshot("unemployment_rate"),
  }), { wrapper });

  await waitFor(() => expect(Object.values(snapshots.result.current).every((query) => query.isSuccess)).toBe(true));
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(snapshots.result.current.gdp.data?.[0]).toMatchObject({ metricId: "gdp_per_capita", year: 2023, unit: "PPS per inhabitant" });
  expect(snapshots.result.current.previousGdp.data?.[0]).toMatchObject({ metricId: "gdp_per_capita", year: 2022 });
  expect(snapshots.result.current.unemployment.data?.[0]).toMatchObject({ metricId: "unemployment_rate", year: 2023, unit: "% of labour force" });
  expect(queryClient.getQueryData(["eurostat", "nuts2", "gdp_per_capita", 2023])).toBe(snapshots.result.current.gdp.data);
  expect(queryClient.getQueryCache().getAll()).toHaveLength(3);
});

it("surfaces API failures as query errors and inherits the disabled retry setting", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" }));
  const { result } = renderHook(() => useNuts2MetricSnapshot("gdp_per_capita"), { wrapper });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBeInstanceOf(EurostatHttpError);
  expect(result.current.error).toMatchObject({ status: 503 });
  expect(result.current.data).toBeUndefined();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("caches available years separately from metric snapshots", async () => {
  const years = renderHook(() => useNuts2MetricYears("gdp_per_capita"), { wrapper });

  await waitFor(() => expect(years.result.current.isSuccess).toBe(true));
  expect(years.result.current.data).toEqual([2024, 2023]);
  expect(queryClient.getQueryData(["eurostat", "nuts2", "years", "gdp_per_capita"])).toBe(
    years.result.current.data,
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("caches a selected region's existing metric history by metric and NUTS ID", async () => {
  const first = renderHook(() => useRegionMetricHistory("FI1B", "gdp_per_capita"), { wrapper });
  const second = renderHook(() => useRegionMetricHistory("FI1B", "gdp_per_capita"), { wrapper });
  await waitFor(() => expect(first.result.current.isSuccess && second.result.current.isSuccess).toBe(true));
  expect(fetch).toHaveBeenCalledTimes(1);
  const url = new URL((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]);
  expect(url.searchParams.getAll("geo")).toEqual(["FI1B"]);
  expect(url.searchParams.has("sinceTimePeriod")).toBe(false);
  expect(queryClient.getQueryData(["eurostat", "history", "gdp_per_capita", "FI1B"])).toBe(first.result.current.data);
});
