import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection, Geometry } from "geojson";

export function buildRegionNames(collection: FeatureCollection<Geometry | null>): ReadonlyMap<string, string> {
  const names = new Map<string, string>();
  for (const { properties } of collection.features) {
    const id = properties?.NUTS_ID;
    const name = [properties?.NAME_LATN, properties?.NUTS_NAME]
      .find((value) => typeof value === "string" && value.trim());
    if (typeof id === "string" && name) names.set(id, name);
  }
  return names;
}

export function regionDisplayName(id: string, names: ReadonlyMap<string, string>): string {
  const name = names.get(id);
  return name && name !== id ? `${name} (${id})` : id;
}

export function useRegionNames() {
  return useQuery({
    queryKey: ["gisco", "nuts2", "2024", "names"],
    queryFn: async ({ signal }) => {
      const response = await fetch(`${import.meta.env.BASE_URL}data/europe-nuts-2-2024.geojson`, { signal });
      if (!response.ok) throw new Error("Unable to load GISCO region names.");
      return buildRegionNames(await response.json());
    },
    staleTime: Infinity,
  });
}
