export interface CountryFlag {
  src: string;
  label: string;
}

const flagAssets = import.meta.glob<string>("../assets/flags/*.svg", {
  eager: true,
  import: "default",
  query: "?url",
});

/** GISCO uses EL for Greece, while the ISO flag asset uses GR. */
export function normalizeGiscoCountryCode(countryCode?: string) {
  const code = countryCode?.trim().toUpperCase();
  if (!code) return undefined;
  return code === "EL" ? "GR" : code;
}

export function getCountryFlag(countryCode?: string, countryName?: string): CountryFlag | undefined {
  const code = normalizeGiscoCountryCode(countryCode);
  if (!code) return undefined;

  const src = flagAssets[`../assets/flags/${code.toLowerCase()}.svg`];
  return src ? { src, label: `Flag of ${countryName ?? code}` } : undefined;
}
