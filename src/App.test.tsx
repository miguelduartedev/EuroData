import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const snapshotMock = vi.hoisted(() => vi.fn());
const metricYearsMock = vi.hoisted(() => vi.fn());
const historyMock = vi.hoisted(() => vi.fn());
const metadataMock = vi.hoisted(() => vi.fn());
vi.mock("./data/region-names", async (importOriginal) => ({
  ...await importOriginal<typeof import("./data/region-names")>(),
  useRegionCatalog: metadataMock,
}));
vi.mock("./api/eurostat/queries", () => ({
  useNuts2MetricSnapshot: snapshotMock,
  useNuts2MetricYears: metricYearsMock,
  useRegionMetricHistory: historyMock,
}));

beforeEach(() => {
  const metadata = new Map([
    ["PT20", { id: "PT20", name: "Região Autónoma dos Açores", countryCode: "PT", countryName: "Portugal" }],
    ["FI1B", { id: "FI1B", name: "Helsinki-Uusimaa", countryCode: "FI", countryName: "Finland" }],
    ["SE11", { id: "SE11", name: "Stockholm", countryCode: "SE", countryName: "Sweden" }],
  ]);
  metadataMock.mockReturnValue({ data: { metadata, selectableIds: new Set(metadata.keys()) } });
  snapshotMock.mockReturnValue({ data: [], isPending: false, isError: false });
  historyMock.mockReturnValue({ data: [], isPending: false, isError: false });
  metricYearsMock.mockReturnValue({ data: [2024, 2023, 2022], isPending: false, isError: false });
});

vi.mock("./components/EuropeMap/EuropeMap", () => {
  function EuropeMap({
    metric,
    regionAId,
    regionBId,
    onRegionClick,
  }: {
    metric: import("./lib/choropleth").MapMetric;
    regionAId?: string;
    regionBId?: string;
    onRegionClick?: (regionId: string) => void;
  }) {
    return (
      <section aria-label="Map test double">
        <output data-testid="map-metric">{`${metric.label}|${metric.year}|${metric.values.get("FI1B")}|${metric.isLoading}|${metric.isError}`}</output>
        <output data-testid="map-selection">{`${regionAId ?? ""}|${regionBId ?? ""}`}</output>
        <button type="button" onClick={() => onRegionClick?.("FI1B")}>Click FI1B</button>
        <button type="button" onClick={() => onRegionClick?.("SE11")}>Click SE11</button>
        <button type="button" onClick={() => onRegionClick?.("NO02")}>Click NO02</button>
        <button type="button" onClick={() => onRegionClick?.("PT20")}>Click PT20</button>
      </section>
    );
  }

  return { EuropeMap };
});

import { App } from "./App";
import { REGION_B_COLOR } from "./lib/region-colors";

afterEach(cleanup);

it("replaces region selectors with map controls while preserving map click selection", () => {
  render(<App />);

  expect(screen.getByRole("combobox", { name: "Metric" })).toHaveValue("GDP per capita (PPS)");
  expect(screen.getByRole("combobox", { name: "Year" })).toHaveValue("2024");
  expect(screen.getByRole("combobox", { name: "Region level" })).toBeDisabled();
  expect(screen.getByRole("heading", { name: "Explore this metric" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Click a region to see details" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Compare regions" })).toBeDisabled();
  expect(screen.queryByText("Key metrics")).not.toBeInTheDocument();
  expect(screen.queryByText("Historical trend")).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Region A" })).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Region B" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Click FI1B" }));
  fireEvent.click(screen.getByRole("button", { name: "Click SE11" }));
  expect(screen.getByTestId("map-selection")).toHaveTextContent("FI1B|SE11");
  expect(screen.getByRole("region", { name: "Region comparison" })).toBeInTheDocument();
  expect(screen.getByLabelText("Region A: Helsinki-Uusimaa")).toBeInTheDocument();
  expect(screen.getByLabelText("Region B: Stockholm")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Explore this metric" })).not.toBeInTheDocument();
});

it("uses selected years for the GDP snapshot and map metadata", () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Show Year options" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Year" }), { target: { value: "2024" } });
  fireEvent.click(screen.getByRole("option", { name: "2024" }));

  expect(snapshotMock).toHaveBeenLastCalledWith("gdp_per_capita", 2024);
  expect(screen.getByTestId("map-metric")).toHaveTextContent("GDP per capita (PPS)|2024");
  expect(screen.getByLabelText("Selected year: 2024")).toBeInTheDocument();
});

it("passes GDP snapshot loading and error state to the map", () => {
  snapshotMock.mockReturnValue({ data: undefined, isPending: true, isError: false });
  const { rerender } = render(<App />);
  expect(snapshotMock).toHaveBeenCalledWith("gdp_per_capita", 2024);
  expect(screen.getByTestId("map-metric")).toHaveTextContent("GDP per capita (PPS)|2024|undefined|true|false");
  snapshotMock.mockReturnValue({ data: [
    { regionId: "FI1B", metricId: "gdp_per_capita", year: 2024, value: 50400, unit: "PPS per inhabitant" },
  ], isPending: false, isError: true });
  rerender(<App />);
  expect(screen.getByTestId("map-metric")).toHaveTextContent("GDP per capita (PPS)|2024|50400|false|true");
});

it("keeps the default year available while the live year list loads or fails", () => {
  metricYearsMock.mockReturnValue({ data: undefined, isPending: true, isError: false });
  const { rerender } = render(<App />);
  expect(screen.getByRole("combobox", { name: "Year" })).toHaveValue("");
  expect(screen.getByRole("combobox", { name: "Year" })).toBeDisabled();
  expect(screen.getByTitle("Loading available years")).toBeInTheDocument();
  expect(screen.queryByText("Loading available years…")).not.toBeInTheDocument();

  metricYearsMock.mockReturnValue({ data: undefined, isPending: false, isError: true });
  rerender(<App />);
  expect(screen.getByRole("combobox", { name: "Year" })).toHaveValue("");
  expect(screen.getByRole("combobox", { name: "Year" })).not.toBeDisabled();
  expect(screen.getByText("Showing the default year while available years are unavailable.")).toBeInTheDocument();
});

it("safely selects and clears PT20 without legacy profile metadata", () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Click PT20" }));
  expect(screen.getByTestId("map-selection")).toHaveTextContent(/^PT20\|$/);
  expect(screen.queryByRole("region", { name: "Selected regions" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Click FI1B" }));
  expect(screen.getByTestId("map-selection")).toHaveTextContent(/^PT20\|FI1B$/);
  expect(screen.getByLabelText("Region A: Região Autónoma dos Açores")).toBeInTheDocument();
  expect(screen.getByLabelText("Region B: Helsinki-Uusimaa")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Click PT20" }));
  expect(screen.getByTestId("map-selection")).toHaveTextContent(/^\|FI1B$/);
  expect(screen.getByRole("region", { name: "Helsinki-Uusimaa" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Region B: Helsinki-Uusimaa")).not.toBeInTheDocument();
});

it("uses one two-region history hook input and returns to single-region mode after deselection", () => {
  snapshotMock.mockReturnValue({ data: [
    { regionId: "FI1B", metricId: "gdp_per_capita", year: 2024, value: 50000, unit: "PPS per inhabitant" },
    { regionId: "PT20", metricId: "gdp_per_capita", year: 2024, value: 25000, unit: "PPS per inhabitant" },
  ], isPending: false, isError: false });
  historyMock.mockReturnValue({ data: [
    { regionId: "FI1B", metricId: "gdp_per_capita", year: 2013, value: 30000, unit: "PPS per inhabitant" },
    { regionId: "FI1B", metricId: "gdp_per_capita", year: 2023, value: 50000, unit: "PPS per inhabitant" },
    { regionId: "PT20", metricId: "gdp_per_capita", year: 2013, value: 20000, unit: "PPS per inhabitant" },
    { regionId: "PT20", metricId: "gdp_per_capita", year: 2023, value: 25000, unit: "PPS per inhabitant" },
  ], isPending: false, isError: false });
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Click FI1B" }));
  fireEvent.click(screen.getByRole("button", { name: "Click PT20" }));
  expect(historyMock).toHaveBeenLastCalledWith(["FI1B", "PT20"], "gdp_per_capita");
  expect(screen.getByRole("region", { name: "Region comparison" })).toBeInTheDocument();
  expect(screen.getByText("25,000 PPS per inhabitant")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Click FI1B" }));
  expect(screen.queryByRole("region", { name: "Region comparison" })).not.toBeInTheDocument();
  const singleRegion = within(screen.getByRole("region", { name: "Região Autónoma dos Açores" }));
  const singleChart = singleRegion.getByRole("img", { name: "GDP per capita (PPS) historical line chart" });
  expect(singleChart.querySelector('[data-series-id="PT20"]')).toHaveAttribute("stroke", REGION_B_COLOR);
  expect(historyMock).toHaveBeenLastCalledWith(["PT20"], "gdp_per_capita");
});

it("shows generic single-region details from the snapshot and restores guidance on deselection", () => {
  snapshotMock.mockImplementation((_metric, year) => ({ data: [
    { regionId: "PT20", metricId: "gdp_per_capita", year, value: year === 2024 ? 29200 : 28100, unit: "PPS per inhabitant" },
  ], isPending: false, isError: false }));
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Click PT20" }));
  let card = within(screen.getByRole("region", { name: "Região Autónoma dos Açores" }));
  expect(card.getByText("Portugal · PT20")).toBeInTheDocument();
  expect(card.getByText("29,200")).toBeInTheDocument();
  expect(card.getByText("PPS per inhabitant · 2024")).toBeInTheDocument();
  expect(screen.getAllByText("Região Autónoma dos Açores (PT20)")).toHaveLength(2);
  expect(screen.queryByText("Click a region to see details")).not.toBeInTheDocument();
  expect(screen.queryByText("Population")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show Year options" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Year" }), { target: { value: "2024" } });
  fireEvent.click(screen.getByRole("option", { name: "2024" }));
  card = within(screen.getByRole("region", { name: "Região Autónoma dos Açores" }));
  expect(card.getByText("29,200")).toBeInTheDocument();
  expect(card.getByText("PPS per inhabitant · 2024")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Click PT20" }));
  expect(screen.getByText("Click a region to see details")).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Região Autónoma dos Açores" })).not.toBeInTheDocument();
});

it("falls back to NUTS ID and No data when metadata and observations are missing", () => {
  metadataMock.mockReturnValue({ data: undefined, isError: true });
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Click PT20" }));
  const card = within(screen.getByRole("region", { name: "PT20" }));
  expect(card.getByText("No data")).toBeInTheDocument();
  expect(card.queryByText(/Portugal/)).not.toBeInTheDocument();
});

it("switches the default map and overview to EUR and reconciles an unavailable year", () => {
  metricYearsMock.mockImplementation((metricId) => ({
    data: metricId === "gdp_per_capita_eur" ? [2022, 2021] : [2024, 2023, 2022],
    isPending: false, isError: false,
  }));
  snapshotMock.mockImplementation((metricId, year) => ({
    data: [{ regionId: "FI1B", metricId, year, value: 42000, unit: "EUR per inhabitant" }],
    isPending: false, isError: false,
  }));
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Show Metric options" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Metric" }), { target: { value: "GDP per capita (EUR)" } });
  fireEvent.click(screen.getByRole("option", { name: "GDP per capita (EUR)" }));

  expect(snapshotMock).toHaveBeenLastCalledWith("gdp_per_capita_eur", 2022);
  expect(screen.getByRole("combobox", { name: "Year" })).toHaveValue("2022");
  expect(screen.getByTestId("map-metric")).toHaveTextContent("GDP per capita (EUR)|2022|42000");
  expect(screen.getByRole("heading", { name: "Explore this metric" })).toBeInTheDocument();
  expect(screen.getAllByText("€42,000")).toHaveLength(3);
});

it("keeps two selected regions while switching to unemployment and updates history, ranks and difference", () => {
  snapshotMock.mockImplementation((metricId, year) => ({
    data: [
      { regionId: "FI1B", metricId, year, value: metricId === "unemployment_rate" ? 3 : 50000, unit: "% of labour force" },
      { regionId: "PT20", metricId, year, value: metricId === "unemployment_rate" ? 8 : 25000, unit: "% of labour force" },
    ], isPending: false, isError: false,
  }));
  historyMock.mockImplementation((_ids, metricId) => ({
    data: [
      { regionId: "FI1B", metricId, year: 2015, value: 5, unit: "% of labour force" },
      { regionId: "FI1B", metricId, year: 2024, value: 3, unit: "% of labour force" },
      { regionId: "PT20", metricId, year: 2015, value: 9, unit: "% of labour force" },
      { regionId: "PT20", metricId, year: 2024, value: 8, unit: "% of labour force" },
    ], isPending: false, isError: false,
  }));
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Click FI1B" }));
  fireEvent.click(screen.getByRole("button", { name: "Click PT20" }));
  fireEvent.click(screen.getByRole("button", { name: "Show Metric options" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Metric" }), { target: { value: "Unemployment rate" } });
  fireEvent.click(screen.getByRole("option", { name: "Unemployment rate" }));

  expect(screen.getByTestId("map-selection")).toHaveTextContent("FI1B|PT20");
  expect(snapshotMock).toHaveBeenLastCalledWith("unemployment_rate", 2024);
  expect(historyMock).toHaveBeenLastCalledWith(["FI1B", "PT20"], "unemployment_rate");
  const comparison = within(screen.getByRole("region", { name: "Region comparison" }));
  expect(comparison.getByText("-5 pp")).toBeInTheDocument();
  expect(comparison.getByLabelText("Region A: Helsinki-Uusimaa")).toHaveTextContent("1 / 2");
  expect(comparison.getByLabelText("Region A: Helsinki-Uusimaa")).toHaveTextContent("-2 pp");
  expect(comparison.getByRole("img", { name: "Unemployment rate comparison line chart" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Click PT20" }));
  const selected = within(screen.getByRole("region", { name: "Helsinki-Uusimaa" }));
  expect(selected.getAllByText("3%").length).toBeGreaterThan(0);
  expect(selected.getByText("-2 pp")).toBeInTheDocument();
  expect(selected.getByRole("img", { name: "Unemployment rate historical line chart" })).toBeInTheDocument();
  fireEvent.mouseEnter(selected.getByRole("button", { name: "Helsinki-Uusimaa, 2024: 3%" }));
  expect(selected.getByRole("tooltip")).toHaveTextContent("3%");
});
