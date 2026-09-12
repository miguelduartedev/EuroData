import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { regions } from "./regions.ts";

const geoJsonAssetPath = `${process.cwd()}/public/data/nordic-nuts-2.geojson`;

async function getGeoJsonRegionIds() {
  const asset = JSON.parse(await readFile(geoJsonAssetPath, "utf8"));

  expect(asset.type).toBe("FeatureCollection");
  expect(asset.features).toHaveLength(26);

  return asset.features.map((feature) => {
    expect(typeof feature.properties?.NUTS_ID).toBe("string");
    return feature.properties.NUTS_ID;
  });
}

describe("Nordic GISCO region alignment", () => {
  it("has one static region entry for every unique bundled NUTS 2 feature", async () => {
    const geoJsonIds = await getGeoJsonRegionIds();
    const regionIds = regions.map((region) => region.id);

    expect(new Set(geoJsonIds)).toHaveLength(26);
    expect(new Set(regionIds)).toHaveLength(26);
    expect([...regionIds].sort()).toEqual([...geoJsonIds].sort());
  });

});
