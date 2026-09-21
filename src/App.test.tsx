import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const snapshotMock = vi.hoisted(() => vi.fn());
const metricYearsMock = vi.hoisted(() => vi.fn());
vi.mock("./api/eurostat/queries", () => ({
  useNuts2MetricSnapshot: snapshotMock,
  useNuts2MetricYears: metricYearsMock,
}));

beforeEach(() => {
  snapshotMock.mockReturnValue({ data: [], isPending: false, isError: false });
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
  expect(screen.getByText("Loading available years…")).toBeInTheDocument();

  metricYearsMock.mockReturnValue({ data: undefined, isPending: false, isError: true });
  rerender(<App />);
  expect(screen.getByRole("combobox", { name: "Year" })).toHaveValue("2023");
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
  expect(screen.getByLabelText("Region B: Helsinki-Uusimaa")).toBeInTheDocument();
});
