import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const snapshotMock = vi.hoisted(() => vi.fn());
const metricYearsMock = vi.hoisted(() => vi.fn());
const historyMock = vi.hoisted(() => vi.fn());
const metadataMock = vi.hoisted(() => vi.fn());
vi.mock("./data/region-names", async (importOriginal) => ({
  ...await importOriginal<typeof import("./data/region-names")>(),
  useRegionMetadata: metadataMock,
}));
vi.mock("./api/eurostat/queries", () => ({
  useNuts2MetricSnapshot: snapshotMock,
  useNuts2MetricYears: metricYearsMock,
  useRegionMetricHistory: historyMock,
}));

beforeEach(() => {
  metadataMock.mockReturnValue({ data: new Map([
    ["PT20", { id: "PT20", name: "Região Autónoma dos Açores", countryCode: "PT", countryName: "Portugal" }],
    ["FI1B", { id: "FI1B", name: "Helsinki-Uusimaa", countryCode: "FI", countryName: "Finland" }],
  ]) });
  snapshotMock.mockReturnValue({ data: [], isPending: false, isError: false });
  historyMock.mockReturnValue({ data: [], isPending: false, isError: false });
  metricYearsMock.mockReturnValue({ data: [2024, 2023, 2022], isPending: false, isError: false });
});

vi.mock("./components/NordicMap/NordicMap", () => {
  function NordicMap({
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

  return { NordicMap };
});

import { App } from "./App";

afterEach(cleanup);

it("replaces region selectors with map controls while preserving map click selection", () => {
  render(<App />);

  expect(screen.getByRole("combobox", { name: "Metric" })).toHaveValue("GDP per capita");
  expect(screen.getByRole("combobox", { name: "Year" })).toHaveValue("2023");
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
  expect(screen.getByLabelText("Region A: Helsinki-Uusimaa")).toBeInTheDocument();
  expect(screen.getByLabelText("Region B: Stockholm")).toBeInTheDocument();
});

it("uses selected years for the GDP snapshot and map metadata", () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Show Year options" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Year" }), { target: { value: "2024" } });
  fireEvent.click(screen.getByRole("option", { name: "2024" }));

  expect(snapshotMock).toHaveBeenLastCalledWith("gdp_per_capita", 2024);
  expect(screen.getByTestId("map-metric")).toHaveTextContent("GDP per capita|2024");
  expect(screen.getByLabelText("Selected year: 2024")).toBeInTheDocument();
});

it("passes GDP snapshot loading and error state to the map", () => {
  snapshotMock.mockReturnValue({ data: undefined, isPending: true, isError: false });
  const { rerender } = render(<App />);
  expect(snapshotMock).toHaveBeenCalledWith("gdp_per_capita", 2023);
  expect(screen.getByTestId("map-metric")).toHaveTextContent("GDP per capita|2023|undefined|true|false");
  snapshotMock.mockReturnValue({ data: [
    { regionId: "FI1B", metricId: "gdp_per_capita", year: 2023, value: 50400, unit: "PPS per inhabitant" },
  ], isPending: false, isError: true });
  rerender(<App />);
  expect(screen.getByTestId("map-metric")).toHaveTextContent("GDP per capita|2023|50400|false|true");
});

it("keeps the default year available while the live year list loads or fails", () => {
  metricYearsMock.mockReturnValue({ data: undefined, isPending: true, isError: false });
  const { rerender } = render(<App />);
  expect(screen.getByRole("combobox", { name: "Year" })).toHaveValue("2023");
  expect(screen.getByRole("combobox", { name: "Year" })).toBeDisabled();
  expect(screen.getByTitle("Loading available years")).toBeInTheDocument();
  expect(screen.queryByText("Loading available years…")).not.toBeInTheDocument();

  metricYearsMock.mockReturnValue({ data: undefined, isPending: false, isError: true });
  rerender(<App />);
  expect(screen.getByRole("combobox", { name: "Year" })).toHaveValue("2023");
  expect(screen.getByRole("combobox", { name: "Year" })).not.toBeDisabled();
  expect(screen.getByText("Showing the default year while available years are unavailable.")).toBeInTheDocument();
});

it("safely selects and clears PT20 without Nordic profile metadata", () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Click PT20" }));
  expect(screen.getByTestId("map-selection")).toHaveTextContent(/^PT20\|$/);
  expect(screen.queryByRole("region", { name: "Selected regions" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Click FI1B" }));
  expect(screen.getByTestId("map-selection")).toHaveTextContent(/^PT20\|FI1B$/);
  expect(screen.getByLabelText("Region B: Helsinki-Uusimaa")).toBeInTheDocument();
  expect(screen.queryByLabelText(/^Region A:/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Click PT20" }));
  expect(screen.getByTestId("map-selection")).toHaveTextContent(/^\|FI1B$/);
  expect(screen.getByRole("region", { name: "Helsinki-Uusimaa" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Region B: Helsinki-Uusimaa")).not.toBeInTheDocument();
});

it("shows generic single-region details from the snapshot and restores guidance on deselection", () => {
  snapshotMock.mockImplementation((_metric, year) => ({ data: [
    { regionId: "PT20", metricId: "gdp_per_capita", year, value: year === 2023 ? 28100 : 29200, unit: "PPS per inhabitant" },
  ], isPending: false, isError: false }));
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Click PT20" }));
  let card = within(screen.getByRole("region", { name: "Região Autónoma dos Açores" }));
  expect(card.getByText("Portugal · PT20")).toBeInTheDocument();
  expect(card.getByText("28,100")).toBeInTheDocument();
  expect(card.getByText("PPS per inhabitant · 2023")).toBeInTheDocument();
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
