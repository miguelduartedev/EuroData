import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection, Geometry } from "geojson";

export interface RegionMetadata {
  id: string;
  name: string;
  countryCode?: string;
  countryName?: string;
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

export function buildRegionMetadata(collection: FeatureCollection<Geometry | null>): ReadonlyMap<string, RegionMetadata> {
  const metadata = new Map<string, RegionMetadata>();
  for (const { properties } of collection.features) {
    const id = nonEmpty(properties?.NUTS_ID);
    if (!id) continue;
    metadata.set(id, {
      id,
      name: nonEmpty(properties?.NAME_LATN) ?? nonEmpty(properties?.NUTS_NAME) ?? id,
      countryCode: nonEmpty(properties?.CNTR_CODE),
      countryName: nonEmpty(properties?.NAME_ENGL),
    });
  }
  return metadata;
}

export function regionDisplayName(id: string, names: ReadonlyMap<string, string>): string {
  const name = names.get(id);
  return name && name !== id ? `${name} (${id})` : id;
}

export function useRegionMetadata() {
  return useQuery({
    queryKey: ["gisco", "nuts2", "2024", "metadata"],
    queryFn: async ({ signal }) => {
      const response = await fetch(`${import.meta.env.BASE_URL}data/europe-nuts-2-2024.geojson`, { signal });
      if (!response.ok) throw new Error("Unable to load GISCO region names.");
      return buildRegionMetadata(await response.json());
    },
    staleTime: Infinity,
  });
}
