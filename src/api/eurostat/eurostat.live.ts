/// <reference types="node" />

import { readFile } from "node:fs/promises";
import type { FeatureCollection } from "geojson";
import { describe, expect, it } from "vitest";
import { buildEurostatDatasetUrl, getEurostatDataset } from "./client";
import { EUROSTAT_SNAPSHOT_YEAR, eurostatMetrics, getMetricHistory, getNuts2MetricSnapshot, getNuts2MetricYears } from "./metrics";
import { parseMetricObservations } from "./parser";
import { summarizeMetric } from "../../lib/metric-summary";
import { changeOverPeriod, filterTrendRange, metricRank, trendPoints } from "../../lib/metric-trend";
import { choroplethBand } from "../../lib/choropleth";
import { getMetricDefinition } from "../../data/metrics";
import { buildSelectableRegionIds } from "../../data/region-names";

const LIVE_REGION_IDS = ["FI1B", "DE11", "PT1A", "PL21"];

function independentlyNormalize(
  metricId: keyof typeof eurostatMetrics,
  dataset: Awaited<ReturnType<typeof getEurostatDataset>>,
) {
  const definition = getMetricDefinition(metricId);
  const source = parseMetricObservations(dataset, {
    metricId,
    unit: definition.sourceUnit ?? definition.unit,
  });
  if (definition.derivation !== "annualPercentChange") return source;

  const byRegion = new Map<string, Map<number, typeof source[number]>>();
  source.forEach((observation) => {
    const years = byRegion.get(observation.regionId) ?? new Map();
    years.set(observation.year, observation);
    byRegion.set(observation.regionId, years);
  });
  return [...byRegion].flatMap(([regionId, years]) => [...years.values()].map((current) => {
    const previous = years.get(current.year - 1);
    const valid = typeof current.value === "number" && typeof previous?.value === "number" && previous.value !== 0;
    return {
      regionId,
      metricId,
      year: current.year,
      value: valid ? ((current.value! - previous.value!) / previous.value!) * 100 : null,
      unit: definition.unit,
      ...(current.status ? { status: current.status } : {}),
    };
  })).sort((first, second) => first.regionId.localeCompare(second.regionId) || first.year - second.year);
}

function expectMetricDimensions(dataset: Awaited<ReturnType<typeof getEurostatDataset>>, filters: Record<string, string>) {
  Object.entries(filters).forEach(([dimensionId, expectedCode]) => {
    expect(Object.keys(dataset.dimension[dimensionId]?.category.index ?? {})).toEqual([expectedCode]);
  });
  dataset.id.forEach((dimensionId, index) => {
    if (dimensionId !== "geo" && dimensionId !== "time") expect(dataset.size[index]).toBe(1);
  });
}

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
    "matches raw snapshot and history data for %s",
    async (metricId) => {
      const metric = eurostatMetrics[metricId];
      const definition = getMetricDefinition(metricId);
      const years = await getNuts2MetricYears(metricId);
      const currentYear = years[0];
      expect(currentYear).toBeTypeOf("number");
      const snapshotTimes = definition.derivation === "annualPercentChange"
        ? [String(currentYear - 1), String(currentYear)]
        : String(currentYear);
      const [snapshot, rawSnapshot, history, rawHistory] = await Promise.all([
        getNuts2MetricSnapshot(metricId, currentYear),
        getEurostatDataset(metric.datasetId, {
          ...metric.filters, geoLevel: "nuts2", time: snapshotTimes,
        }),
        getMetricHistory(LIVE_REGION_IDS, metricId),
        getEurostatDataset(metric.datasetId, { ...metric.filters, geo: LIVE_REGION_IDS }),
      ]);
      const parsedSnapshot = independentlyNormalize(metricId, rawSnapshot).filter(({ year }) => year === currentYear);
      const parsedHistory = independentlyNormalize(metricId, rawHistory);
      const geometry: FeatureCollection = JSON.parse(await readFile(
        new URL("../../../public/data/europe-nuts-2-2024.geojson", import.meta.url), "utf8",
      ));
      const selectableRegionIds = buildSelectableRegionIds(geometry);

      expectMetricDimensions(rawSnapshot, metric.filters);
      expectMetricDimensions(rawHistory, metric.filters);
      expect(snapshot).toEqual(parsedSnapshot);
      expect(history).toEqual(parsedHistory);
      expect(snapshot.every(({ year, unit }) => year === currentYear && unit === metric.unit)).toBe(true);

      const sampleValues = LIVE_REGION_IDS.map((regionId) => snapshot.find((row) => row.regionId === regionId));
      sampleValues.forEach((sample) => {
        expect(sample).toBeDefined();
        expect(typeof sample?.value).toBe("number");
      });

      const rawValues = snapshot
        .filter((row): row is typeof row & { value: number } => row.value !== null)
        .filter((row) => selectableRegionIds.has(row.regionId))
        .sort((first, second) => first.regionId.localeCompare(second.regionId));
      const expectedHighest = [...rawValues].sort((first, second) => second.value - first.value || first.regionId.localeCompare(second.regionId))[0];
      const expectedLowest = [...rawValues].sort((first, second) => first.value - second.value || first.regionId.localeCompare(second.regionId))[0];
      const expectedAverage = rawValues.reduce((sum, row) => sum + row.value, 0) / rawValues.length;
      const summary = summarizeMetric(snapshot, metricId, currentYear, selectableRegionIds);
      expect(summary).toMatchObject({
        count: rawValues.length,
        highest: { regionId: expectedHighest.regionId, value: expectedHighest.value },
        lowest: { regionId: expectedLowest.regionId, value: expectedLowest.value },
      });
      expect(summary.average).toBeCloseTo(expectedAverage, 8);

      const ranked = [...rawValues].sort((first, second) =>
        (definition.rankDirection === "higher" ? second.value - first.value : first.value - second.value) ||
        first.regionId.localeCompare(second.regionId),
      );
      const sampleRanks = sampleValues.map((sample) => {
        expect(metricRank(snapshot, metricId, currentYear, sample!.regionId, definition.rankDirection, selectableRegionIds))
          .toEqual({ position: ranked.findIndex((row) => row.regionId === sample!.regionId) + 1, total: ranked.length });
        expect(choroplethBand(sample!.value, definition.choropleth)).not.toBeNull();
        return { regionId: sample!.regionId, position: ranked.findIndex((row) => row.regionId === sample!.regionId) + 1, total: ranked.length };
      });

      const fi1bTrend = trendPoints(history, "FI1B", metricId);
      const rawFi1bTrend = parsedHistory.filter((row) => row.regionId === "FI1B").map(({ year, value }) => ({ year, value }));
      expect(fi1bTrend).toEqual(rawFi1bTrend);
      expect(fi1bTrend).toEqual([...fi1bTrend].sort((first, second) => first.year - second.year));
      const validYears = fi1bTrend.filter((point) => point.value !== null).map((point) => point.year);
      const range = { fromYear: validYears[0], toYear: validYears.at(-1)! };
      const filtered = filterTrendRange(fi1bTrend, range);
      expect(filtered).toEqual(fi1bTrend.filter(({ year }) => year >= range.fromYear && year <= range.toYear));
      expect(fi1bTrend).toEqual(rawFi1bTrend);
      const validTrend = filtered.filter((point): point is typeof point & { value: number } => point.value !== null);
      const first = validTrend[0];
      const last = validTrend.at(-1)!;
      expect(changeOverPeriod(filtered, definition.periodChange)).toEqual({
        value: definition.periodChange === "percentagePoints"
          ? last.value - first.value
          : ((last.value - first.value) / Math.abs(first.value)) * 100,
        sinceYear: first.year,
      });

      console.info(JSON.stringify({
        metricId,
        currentYear,
        snapshotRequest: buildEurostatDatasetUrl(metric.datasetId, {
          ...metric.filters, geoLevel: "nuts2", time: snapshotTimes,
        }).toString(),
        samples: sampleValues,
        sampleRanks,
        summary,
        validMapRegions: rawValues.length,
        datasetOnlyNumeric: snapshot.filter(({ regionId, value }) => value !== null && !selectableRegionIds.has(regionId)).map(({ regionId }) => regionId),
        geometryWithoutNumericObservation: [...selectableRegionIds].filter((regionId) =>
          !snapshot.some((observation) => observation.regionId === regionId && observation.value !== null),
        ),
        fi1bHistory: fi1bTrend.filter(({ year }) => [2015, 2019, 2023].includes(year)),
      }, null, 2));
    },
  );
});
