# European NUTS 2 geometry

`public/data/europe-nuts-2-2024.geojson` is the complete, unfiltered Eurostat
GISCO `NUTS_RG_20M_2024_4326_LEVL_2.geojson` distribution file. It contains all
NUTS 2024 Level 2 features, including geographically outlying regions such as
the Azores, Madeira, the Balearic Islands, and the Canary Islands.

The source uses WGS84 (EPSG:4326) coordinates and 1:20M generalised geometry.
Every feature has the official `NUTS_ID` property, which is the canonical map
interaction and Eurostat-statistics join key. The asset is bundled so the
application makes no runtime GISCO request; it is subject to the GISCO download
and usage provisions.

`public/data/uk-country-2024.geojson` is the separate GISCO
`UK-region-20m-4326-2024.geojson` country geometry from the same 2024 release,
scale, and CRS. It is rendered as neutral, non-interactive map context only;
it contains no NUTS 2 regions and is never used as a statistics join source.
