import denmarkFlag from "../assets/flags/dk.svg";
import finlandFlag from "../assets/flags/fi.svg";
import icelandFlag from "../assets/flags/is.svg";
import norwayFlag from "../assets/flags/no.svg";
import swedenFlag from "../assets/flags/se.svg";
import type { NordicCountry } from "../types/region";

export interface CountryFlag {
  src: string;
  label: string;
}

export const countryFlags: Record<NordicCountry, CountryFlag> = {
  DK: { src: denmarkFlag, label: "Flag of Denmark" },
  FI: { src: finlandFlag, label: "Flag of Finland" },
  IS: { src: icelandFlag, label: "Flag of Iceland" },
  NO: { src: norwayFlag, label: "Flag of Norway" },
  SE: { src: swedenFlag, label: "Flag of Sweden" },
};
