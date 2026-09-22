import { MapPinIcon } from "lucide-react";
import { getCountryFlag } from "@/lib/country-flags";

interface CountryFlagProps {
  countryCode?: string;
  countryName?: string;
  className?: string;
  fallbackClassName?: string;
}

export function CountryFlag({ countryCode, countryName, className = "size-full object-cover", fallbackClassName = "size-6" }: CountryFlagProps) {
  const flag = getCountryFlag(countryCode, countryName);

  return flag ? <img src={flag.src} alt={flag.label} className={className} /> :
    <MapPinIcon aria-hidden="true" className={fallbackClassName} strokeWidth={1.5} />;
}
