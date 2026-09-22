import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { getCountryFlag, normalizeGiscoCountryCode } from "./country-flags";

it("resolves local Flag-icons assets for direct GISCO country codes and Greece", () => {
  expect(getCountryFlag("PT", "Portugal")).toMatchObject({ label: "Flag of Portugal" });
  expect(getCountryFlag("TR", "Türkiye")).toMatchObject({ label: "Flag of Türkiye" });
  expect(getCountryFlag("XK", "Kosovo")).toMatchObject({ label: "Flag of Kosovo" });
  expect(getCountryFlag("EL", "Greece")?.src).toBe(getCountryFlag("GR", "Greece")?.src);
  expect(normalizeGiscoCountryCode(" el ")).toBe("GR");
  expect(getCountryFlag("XX")).toBeUndefined();
  expect(getCountryFlag()).toBeUndefined();
});

it("covers every country code represented in the bundled NUTS 2 geometry", () => {
  const geometry = JSON.parse(readFileSync(resolve(process.cwd(), "public/data/europe-nuts-2-2024.geojson"), "utf8")) as {
    features: Array<{ properties?: { CNTR_CODE?: string } }>;
  };
  const countryCodes = new Set(geometry.features.map(({ properties }) => properties?.CNTR_CODE).filter((code): code is string => Boolean(code)));

  expect(countryCodes.size).toBeGreaterThan(0);
  for (const code of countryCodes) expect(getCountryFlag(code)).toBeDefined();
});
