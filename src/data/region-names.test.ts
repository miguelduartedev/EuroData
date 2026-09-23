import { expect, it } from "vitest";
import { buildRegionMetadata, buildSelectableRegionIds, regionDisplayName } from "./region-names";

it("uses GISCO name precedence and falls back to source IDs", () => {
  const metadata = buildRegionMetadata({ type: "FeatureCollection", features: [
    { type: "Feature", geometry: null, properties: { NUTS_ID: "PT20", NAME_LATN: "Açores", NUTS_NAME: "Other", CNTR_CODE: "PT", NAME_ENGL: "Portugal", CAPT: "Lisbon" } },
    { type: "Feature", geometry: null, properties: { NUTS_ID: "ES70", NAME_LATN: "", NUTS_NAME: "Canarias" } },
    { type: "Feature", geometry: null, properties: { NUTS_ID: "PTZZ" } },
  ] });
  expect(metadata.get("PT20")).toEqual({ id: "PT20", name: "Açores", countryCode: "PT", countryName: "Portugal" });
  expect(metadata.get("PTZZ")).toMatchObject({ id: "PTZZ", name: "PTZZ" });
  expect(metadata.get("PTZZ")?.countryName).toBeUndefined();
  const names = new Map([...metadata].map(([id, region]) => [id, region.name]));
  expect(regionDisplayName("PT20", names)).toBe("Açores (PT20)");
  expect(regionDisplayName("ES70", names)).toBe("Canarias (ES70)");
  expect(regionDisplayName("PTZZ", names)).toBe("PTZZ");
  expect(regionDisplayName("FI1B", new Map())).toBe("FI1B");
});

it("derives selectable IDs from GISCO polygons rather than code patterns", () => {
  const collection = { type: "FeatureCollection" as const, features: [
    { type: "Feature" as const, geometry: { type: "Polygon" as const, coordinates: [] }, properties: { NUTS_ID: "PT20" } },
    { type: "Feature" as const, geometry: null, properties: { NUTS_ID: "FIZZ" } },
    { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [0, 0] }, properties: { NUTS_ID: "NLZZ" } },
  ] };
  expect(buildSelectableRegionIds(collection)).toEqual(new Set(["PT20"]));
});
