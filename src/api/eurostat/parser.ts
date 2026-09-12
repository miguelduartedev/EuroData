import type { MetricId, Observation } from "../../types/metric";
import { EurostatResponseError } from "./client";
import type { EurostatJsonStatDataset } from "./types";

interface ParseMetricOptions {
  metricId: MetricId;
  unit: string;
}

function codesByPosition(
  dataset: EurostatJsonStatDataset,
  dimensionId: string,
  expectedSize: number,
): string[] {
  const dimension = dataset.dimension[dimensionId];
  if (!dimension || !dimension.category || !dimension.category.index) {
    throw new EurostatResponseError(`Eurostat response is missing the ${dimensionId} dimension.`);
  }

  const entries = Object.entries(dimension.category.index)
    .sort(([, firstPosition], [, secondPosition]) => firstPosition - secondPosition)
  if (
    entries.length !== expectedSize ||
    entries.some(([, position], index) => !Number.isInteger(position) || position !== index)
  ) {
    throw new EurostatResponseError(`Eurostat response has invalid category indexes for ${dimensionId}.`);
  }

  return entries.map(([code]) => code);
}

function validateDataset(dataset: EurostatJsonStatDataset): void {
  if (!Array.isArray(dataset.id) || !Array.isArray(dataset.size) || dataset.id.length !== dataset.size.length) {
    throw new EurostatResponseError("Eurostat response has invalid dimension metadata.");
  }

  if (!dataset.id.includes("geo") || !dataset.id.includes("time") || !dataset.dimension) {
    throw new EurostatResponseError("Eurostat response does not contain geography and time dimensions.");
  }

  dataset.id.forEach((dimensionId, index) => {
    if (!Number.isInteger(dataset.size[index]) || dataset.size[index] < 1) {
      throw new EurostatResponseError(`Eurostat response has an invalid size for ${dimensionId}.`);
    }
    codesByPosition(dataset, dimensionId, dataset.size[index]);
  });
}

function flatIndex(dataset: EurostatJsonStatDataset, positions: number[]): number {
  return positions.reduce((result, position, dimensionIndex) => {
    const stride = dataset.size.slice(dimensionIndex + 1).reduce((product, size) => product * size, 1);
    return result + position * stride;
  }, 0);
}

function valueAt(dataset: EurostatJsonStatDataset, index: number): number | null {
  const value = Array.isArray(dataset.value) ? dataset.value[index] : dataset.value?.[String(index)];

  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "number") {
    throw new EurostatResponseError(`Eurostat response has a non-numeric observation at index ${index}.`);
  }
  return value;
}

function statusAt(dataset: EurostatJsonStatDataset, index: number): string | undefined {
  const status = Array.isArray(dataset.status) ? dataset.status[index] : dataset.status?.[String(index)];
  return typeof status === "string" ? status : undefined;
}

export function parseMetricObservations(
  dataset: EurostatJsonStatDataset,
  { metricId, unit }: ParseMetricOptions,
): Observation[] {
  validateDataset(dataset);

  const dimensionCodes = dataset.id.map((dimensionId, index) =>
    codesByPosition(dataset, dimensionId, dataset.size[index]),
  );
  const geoDimensionIndex = dataset.id.indexOf("geo");
  const timeDimensionIndex = dataset.id.indexOf("time");
  const observations: Observation[] = [];

  dimensionCodes[geoDimensionIndex].forEach((regionId, geoPosition) => {
    dimensionCodes[timeDimensionIndex].forEach((timeCode, timePosition) => {
      const year = Number(timeCode);
      if (!Number.isInteger(year)) {
        throw new EurostatResponseError(`Eurostat response contains a non-annual time value: ${timeCode}.`);
      }

      const positions = dataset.size.map(() => 0);
      positions[geoDimensionIndex] = geoPosition;
      positions[timeDimensionIndex] = timePosition;
      const index = flatIndex(dataset, positions);
      const status = statusAt(dataset, index);

      observations.push({
        regionId,
        metricId,
        year,
        value: valueAt(dataset, index),
        unit,
        ...(status ? { status } : {}),
      });
    });
  });

  return observations.sort((first, second) =>
    first.regionId.localeCompare(second.regionId) || first.year - second.year,
  );
}
