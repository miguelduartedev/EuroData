# Nordic NUTS 2 geometry

`public/data/nordic-nuts-2.geojson` is a static subset of Eurostat GISCO's
`NUTS_RG_20M_2024_4326_LEVL_2.geojson` dataset. It contains the NUTS 2024 level
2 Polygon and MultiPolygon features whose `CNTR_CODE` is Denmark (`DK`), Finland
(`FI`), Iceland (`IS`), Norway (`NO`), or Sweden (`SE`).

The source file uses WGS84 coordinates and each retained feature has the
official `NUTS_ID` property used by the map interaction boundary. The asset is
bundled so the application does not make a runtime request to GISCO. The
geometry is generalised for 1:20M-scale mapping and is subject to the GISCO
download and usage provisions.
