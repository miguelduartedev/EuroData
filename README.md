# EuroData

EuroData is an interactive web app for exploring and comparing **European NUTS 2 regions** using official European statistical data.

The goal is to make regional economic data easier to understand through an interactive map, direct region-to-region comparisons, and historical trends.

The explorer covers Europe-wide NUTS 2 regions.

## What it does

Users can explore European statistical regions on a choropleth map, view single-region details and historical trends, and compare two regions.

Each metric is backed by historical annual data, allowing the app to show both the latest available value and how the regions have developed over time.

## Data

All statistical data comes from the official **Eurostat Statistics API**.

Current datasets:

| Metric            | Eurostat dataset  |
| ----------------- | ----------------- |
| GDP per capita (PPS) | `nama_10r_2gdp` |
| GDP per capita (EUR) | `nama_10r_2gdp` |
| Unemployment rate | `lfst_r_lfu3rt`   |
| Real GDP growth | `nama_10r_2gvagr` |

Different indicators may have different latest available years.

Regional boundaries come from **Eurostat GISCO** using the NUTS 2 classification.

## Map

The map is built with **MapLibre GL JS** and uses official GISCO GeoJSON geometry.

Each region is identified using its `NUTS_ID`, which is also used when requesting regional statistics from Eurostat.

This means the geographic and statistical data share the same regional identifiers.

## Tech stack

- React
- TypeScript
- Vite
- TanStack Query
- MapLibre GL JS
- Eurostat Statistics API
- Eurostat GISCO
- Vitest
- React Testing Library
- Tailwind

## Data architecture

Eurostat responses use a multidimensional JSON-stat format which is intentionally kept outside the UI layer.

The application normalizes external data into a simpler internal model:

```ts
type Observation = {
  regionId: string
  metricId: MetricId
  year: number
  value: number | null
  unit: string
  status?: string
}
```

The intended data flow is:

```text
Eurostat Statistics API
        ↓
Eurostat adapter
        ↓
Normalized observations
        ↓
TanStack Query
        ↓
React UI
```

Geographic data is handled separately:

```text
GISCO NUTS 2 GeoJSON
        ↓
MapLibre
        ↓
Interactive European regions
```

This keeps Eurostat-specific response formats and dataset details isolated from the rest of the application.

## Current status

The project is under active development.

## Running locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run tests:

```bash
npm test
```

## Data verification

The project also contains a live Eurostat verification command:

```bash
npm run verify:eurostat
```

This checks the real API against selected European regions and verifies that the configured datasets can be parsed into the application's normalized format.

## Why make this project

I just like maps and nerdy country data

## Data sources

- Eurostat Statistics API
- Eurostat GISCO / NUTS
