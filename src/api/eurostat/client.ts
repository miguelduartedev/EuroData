import type { EurostatJsonStatDataset } from "./types";

export const EUROSTAT_API_BASE_URL = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";

export class EurostatHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly url: string,
  ) {
    super(`Eurostat request failed with ${status} ${statusText}.`);
    this.name = "EurostatHttpError";
  }
}

export class EurostatNetworkError extends Error {
  constructor(
    public readonly url: string,
    public readonly cause: unknown,
  ) {
    super("Eurostat request could not reach the API.");
    this.name = "EurostatNetworkError";
  }
}

export class EurostatResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EurostatResponseError";
  }
}

export type EurostatFilters = Record<string, string | readonly string[]>;

export function buildEurostatDatasetUrl(datasetId: string, filters: EurostatFilters): URL {
  const url = new URL(`${EUROSTAT_API_BASE_URL}/${datasetId}`);

  for (const [dimension, value] of Object.entries(filters)) {
    const values = Array.isArray(value) ? value : [value];
    values.forEach((dimensionValue) => url.searchParams.append(dimension, dimensionValue));
  }

  return url;
}

export async function getEurostatDataset(
  datasetId: string,
  filters: EurostatFilters,
): Promise<EurostatJsonStatDataset> {
  const url = buildEurostatDatasetUrl(datasetId, filters);
  let response: Response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new EurostatNetworkError(url.toString(), error);
  }

  if (!response.ok) {
    throw new EurostatHttpError(response.status, response.statusText, url.toString());
  }

  try {
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new EurostatResponseError("Eurostat returned an unexpected JSON-stat response.");
    }
    return payload as EurostatJsonStatDataset;
  } catch (error) {
    if (error instanceof EurostatResponseError) {
      throw error;
    }
    throw new EurostatResponseError("Eurostat returned an invalid JSON response.");
  }
}
