import type { Region } from "../types/region";

/**
 * European NUTS 2 comparison metadata retained for the current selector/profile UI.
 * Every ID is present in the complete public/data/europe-nuts-2-2024.geojson GISCO asset.
 */
export const regions: Region[] = [
  { id: "DK01", name: "Hovedstaden", countryCode: "DK", countryName: "Denmark" },
  { id: "DK02", name: "Sjælland", countryCode: "DK", countryName: "Denmark" },
  { id: "DK03", name: "Syddanmark", countryCode: "DK", countryName: "Denmark" },
  { id: "DK04", name: "Midtjylland", countryCode: "DK", countryName: "Denmark" },
  { id: "DK05", name: "Nordjylland", countryCode: "DK", countryName: "Denmark" },
  { id: "FI19", name: "Länsi-Suomi", countryCode: "FI", countryName: "Finland" },
  { id: "FI1B", name: "Helsinki-Uusimaa", countryCode: "FI", countryName: "Finland" },
  { id: "FI1C", name: "Etelä-Suomi", countryCode: "FI", countryName: "Finland" },
  { id: "FI1D", name: "Pohjois- ja Itä-Suomi", countryCode: "FI", countryName: "Finland" },
  { id: "FI20", name: "Åland", countryCode: "FI", countryName: "Finland" },
  { id: "IS00", name: "Ísland", countryCode: "IS", countryName: "Iceland" },
  { id: "NO02", name: "Innlandet", countryCode: "NO", countryName: "Norway" },
  { id: "NO06", name: "Trøndelag/Trööndelage", countryCode: "NO", countryName: "Norway" },
  { id: "NO0A", name: "Vestlandet", countryCode: "NO", countryName: "Norway" },
  { id: "NO07", name: "Nord-Norge", countryCode: "NO", countryName: "Norway" },
  { id: "NO08", name: "Oslo og Viken", countryCode: "NO", countryName: "Norway" },
  { id: "NO09", name: "Agder og Sør-Østlandet", countryCode: "NO", countryName: "Norway" },
  { id: "NO0B", name: "Svalbard og Jan Mayen", countryCode: "NO", countryName: "Norway" },
  { id: "SE11", name: "Stockholm", countryCode: "SE", countryName: "Sweden" },
  { id: "SE12", name: "Östra Mellansverige", countryCode: "SE", countryName: "Sweden" },
  { id: "SE21", name: "Småland med öarna", countryCode: "SE", countryName: "Sweden" },
  { id: "SE22", name: "Sydsverige", countryCode: "SE", countryName: "Sweden" },
  { id: "SE23", name: "Västsverige", countryCode: "SE", countryName: "Sweden" },
  { id: "SE31", name: "Norra Mellansverige", countryCode: "SE", countryName: "Sweden" },
  { id: "SE32", name: "Mellersta Norrland", countryCode: "SE", countryName: "Sweden" },
  { id: "SE33", name: "Övre Norrland", countryCode: "SE", countryName: "Sweden" },
];
