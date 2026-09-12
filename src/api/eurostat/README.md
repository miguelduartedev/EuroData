# Eurostat runtime data

The browser requests the official [Eurostat Statistics API](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/) directly; no key or server proxy is required.

| Application metric | Dataset | Annual filters | Normalized unit |
| --- | --- | --- | --- |
| GDP per capita | [`nama_10r_2gdp`](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_2gdp) | `freq=A`, `unit=PPS_EU27_2020_HAB` | PPS per inhabitant |
| Unemployment rate | [`lfst_r_lfu3rt`](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfst_r_lfu3rt) | `freq=A`, `isced11=TOTAL`, `sex=T`, `age=Y15-74`, `unit=PC` | % of labour force |
| Real GDP growth | [`nama_10r_2gvagr`](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10r_2gvagr) | `freq=A`, `na_item=B1GQ`, `unit=PCH_PRE` | % change on previous year |

Requests are constrained to the supplied NUTS IDs and observations from 2015 onwards. GDP per capita uses PPS so regions can be compared across countries. The API preserves the source's available years, flags, and missing values, so metrics can legitimately have different latest years.
