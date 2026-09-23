# Eurostat runtime data

The browser requests the official [Eurostat Statistics API](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/) directly; no key or server proxy is required.

| Application metric | Dataset | Annual filters | Normalized unit |
| --- | --- | --- | --- |
| GDP per capita (PPS) | [`nama_10r_2gdp`](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_2gdp) | `freq=A`, `unit=PPS_EU27_2020_HAB` | PPS per inhabitant |
| GDP per capita (EUR) | [`nama_10r_2gdp`](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_2gdp) | `freq=A`, `unit=EUR_HAB` | EUR per inhabitant |
| Unemployment rate | [`lfst_r_lfu3rt`](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfst_r_lfu3rt) | `freq=A`, `isced11=TOTAL`, `sex=T`, `age=Y15-74`, `unit=PC` | % of labour force |
| Real GDP growth | [`nama_10r_2gvagr`](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_2gvagr) | `freq=A`, `na_item=B1GQ`, `unit=PCH_PRE` | % change on previous year |

`src/data/metrics.ts` is the supported-metric registry. It supplies the dropdown, API filters, units, value formats, ranking direction, historical-change mode, and choropleth scales. GDP values use relative period changes; growth and unemployment rates use percentage-point changes. Unemployment ranks lower values first; the other three metrics rank higher values first. History requests (`getMetricHistory` and `getRegionMetrics`) are constrained to supplied NUTS IDs but retrieve the available annual series without a fixed start year. The API preserves available years, flags, and missing values, so metrics can have different latest years.

## Europe-wide annual snapshot

`getNuts2MetricSnapshot(metricId, year = 2023)` uses the same metric registry,
HTTP client, JSON-stat parser, and `Observation` type as history requests. For GDP:

```text
https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_2gdp?freq=A&unit=PPS_EU27_2020_HAB&geoLevel=nuts2&time=2023
```

The [Statistics API geography and time filters](https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started/api)
select all available NUTS 2 categories for one year without an explicit region
list. `PPS_EU27_2020_HAB` means purchasing power standard (PPS, EU27 from 2020),
per inhabitant; observations retain the existing `PPS per inhabitant` unit label.
This is neither euros nor an EU-average index. A fixed year fixes the request
scope, but Eurostat can revise the published values. The EUR metric instead
requests `unit=EUR_HAB` from the same dataset.

`useNuts2MetricSnapshot(metricId, year)` in `queries.ts` exposes this request
through the existing TanStack Query provider with key
`["eurostat", "nuts2", metricId, year]` and a one-hour stale time. It inherits the
provider's retry and window-focus behavior. `useNuts2MetricYears(metricId)` derives
descending years that contain at least one numeric regional observation; its cached
result determines the initial year and the year options for that metric. App mounts
the snapshot for the selected metric and resolved year (latest available on initial
load and after metric changes). A value lookup joins observations to GISCO features by
`NUTS_ID` in a derived GeoJSON collection, without mutating the original geometry.
The map renders a metric-specific choropleth with a shared colour scale and legend:
PPS breaks at 20k, 30k, 40k, 50k, 70k; EUR at 15k, 25k, 35k, 50k, 70k;
unemployment at 3%, 5%, 7%, 10%, 15%; and diverging growth around zero at
−5%, −2%, −0.5%, +0.5%, +2%, +5%. These fixed breaks describe the inspected
2023 distributions and stay stable when changing years.
Missing or null observations remain a neutral no-data state, never zero.

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
