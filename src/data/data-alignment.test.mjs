import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { regions } from "./regions.ts";

const geoJsonAssetPath = `${process.cwd()}/public/data/europe-nuts-2-2024.geojson`;
const ukContextAssetPath = `${process.cwd()}/public/data/uk-country-2024.geojson`;

async function getGeoJsonRegionIds() {
  const asset = JSON.parse(await readFile(geoJsonAssetPath, "utf8"));

  expect(asset.type).toBe("FeatureCollection");
  expect(asset.features.length).toBeGreaterThan(26);

  return asset.features.map((feature) => {
    expect(typeof feature.properties?.NUTS_ID).toBe("string");
    expect(feature.properties?.LEVL_CODE).toBe(2);
    expect(["Polygon", "MultiPolygon"]).toContain(feature.geometry?.type);
    return feature.properties.NUTS_ID;
  });
}

describe("European GISCO NUTS 2 geometry", () => {
  it("contains unique Level 2 IDs and retains all European comparison metadata", async () => {
    const geoJsonIds = await getGeoJsonRegionIds();
    const regionIds = regions.map((region) => region.id);

    expect(new Set(geoJsonIds)).toHaveLength(geoJsonIds.length);
    expect(new Set(regionIds)).toHaveLength(26);
    expect(regionIds.every((regionId) => geoJsonIds.includes(regionId))).toBe(true);
  });

  it("includes representative outlying Portuguese and Spanish NUTS 2 regions", async () => {
    const geoJsonIds = await getGeoJsonRegionIds();

    expect(geoJsonIds).toEqual(expect.arrayContaining(["PT20", "PT30", "ES53", "ES70"]));
  });

  it("keeps the United Kingdom as separate country context, not NUTS 2 data", async () => {
    const asset = JSON.parse(await readFile(ukContextAssetPath, "utf8"));

    expect(asset.type).toBe("FeatureCollection");
    expect(asset.features).toHaveLength(1);
    expect(asset.features[0].properties?.CNTR_ID).toBe("UK");
    expect(["Polygon", "MultiPolygon"]).toContain(asset.features[0].geometry?.type);
  });
});
