# Eurostat runtime data

The browser requests the official [Eurostat Statistics API](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/) directly; no key or server proxy is required.

| Application metric | Dataset | Annual filters | Normalized unit |
| --- | --- | --- | --- |
| GDP per capita | [`nama_10r_2gdp`](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_2gdp) | `freq=A`, `unit=PPS_EU27_2020_HAB` | PPS per inhabitant |
| Unemployment rate | [`lfst_r_lfu3rt`](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfst_r_lfu3rt) | `freq=A`, `isced11=TOTAL`, `sex=T`, `age=Y15-74`, `unit=PC` | % of labour force |
| Real GDP growth | [`nama_10r_2gvagr`](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_2gvagr) | `freq=A`, `na_item=B1GQ`, `unit=PCH_PRE` | % change on previous year |

History requests (`getMetricHistory` and `getRegionMetrics`) are constrained to the supplied NUTS IDs and observations from 2015 onwards. GDP per capita uses PPS so regions can be compared across countries. The API preserves the source's available years, flags, and missing values, so metrics can legitimately have different latest years.

## Europe-wide annual snapshot

`getNuts2MetricSnapshot(metricId, year = 2023)` uses the same metric configuration,
HTTP client, JSON-stat parser, and `Observation` type as history requests. For GDP:

```text
https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_2gdp?freq=A&unit=PPS_EU27_2020_HAB&geoLevel=nuts2&time=2023
```

The [Statistics API geography and time filters](https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started/api)
select all available NUTS 2 categories for one year without an explicit region
list. `PPS_EU27_2020_HAB` means purchasing power standard (PPS, EU27 from 2020),
per inhabitant; observations retain the existing `PPS per inhabitant` unit label.
This is neither euros nor an EU-average index. A fixed year fixes the request
scope, but Eurostat can revise the published values.

`useNuts2MetricSnapshot(metricId, year = 2023)` in `queries.ts` exposes this request
through the existing TanStack Query provider with key
`["eurostat", "nuts2", metricId, year]` and a one-hour stale time. It inherits the
provider's retry and window-focus behavior. The hook is not mounted in the UI;
the map retains its neutral styling and the comparison experience is unchanged.

Normalization retains source geography codes, missing values as `null`, numeric
zero, and opaque observation flags. It does not filter by European metadata or
geometry, and does not create observations for geometry-only regions. Dataset
IDs without matching GISCO `NUTS_ID` features remain valid source observations;
they must not be remapped onto unrelated polygons. UK country context is a
separate map source, never a statistics join target.

## Developer verification

Run `npm run verify:eurostat` for opt-in network checks. It retains the European
history checks and reports snapshot totals, numeric/missing/flagged counts,
samples from Portugal, Spain, Finland, Sweden and Germany, and differences
against the bundled NUTS 2024 geometry. It also checks that this snapshot has no
UK regional codes. Ordinary `npm test` uses deterministic fixtures without
Eurostat network access.

On 2026-09-20 the 2023 GDP request returned 309 observations: 276 numeric,
33 missing, and 102 flagged. Of these, 293 IDs matched the 299 geometry features.
The 16 dataset-only IDs were `BEZZ`, `DKZZ`, `ESZZ`, `FRZZ`, `ITZZ`, `LVZZ`,
`HUZZ`, `MTZZ`, `NLZZ`, `ATZZ`, `PTZZ`, `ROZZ`, `FIZZ`, `SEZZ`, `NOZZ`, and
`RSZZ`. Geometry-only IDs were `LI00`, `BA01`, `BA02`, `BA03`, `XK00`, and `IS00`.
No UK IDs were returned. These counts are diagnostic observations, not fixed
test expectations or a region allowlist.
