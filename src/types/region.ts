export type NordicCountry = "DK" | "FI" | "IS" | "NO" | "SE";

export interface Region {
  id: string;
  name: string;
  countryCode: NordicCountry;
  countryName: string;
}
