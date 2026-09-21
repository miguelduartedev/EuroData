import { expect, it } from "vitest";
import { buildRegionNames, regionDisplayName } from "./region-names";

it("uses GISCO name precedence and falls back to source IDs", () => {
  const names = buildRegionNames({ type: "FeatureCollection", features: [
    { type: "Feature", geometry: null, properties: { NUTS_ID: "PT20", NAME_LATN: "Açores", NUTS_NAME: "Other" } },
    { type: "Feature", geometry: null, properties: { NUTS_ID: "ES70", NAME_LATN: "", NUTS_NAME: "Canarias" } },
    { type: "Feature", geometry: null, properties: { NUTS_ID: "PTZZ" } },
  ] });
  expect(regionDisplayName("PT20", names)).toBe("Açores (PT20)");
  expect(regionDisplayName("ES70", names)).toBe("Canarias (ES70)");
  expect(regionDisplayName("PTZZ", names)).toBe("PTZZ");
  expect(regionDisplayName("FI1B", new Map())).toBe("FI1B");
});
