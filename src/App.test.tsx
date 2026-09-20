import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const snapshotMock = vi.hoisted(() => vi.fn());
vi.mock("./api/eurostat/queries", () => ({ useNuts2MetricSnapshot: snapshotMock }));

beforeEach(() => {
  snapshotMock.mockReturnValue({ data: [], isPending: false, isError: false });
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
      </section>
    );
  }

  return { NordicMap };
});

import { App } from "./App";

afterEach(cleanup);

it("synchronizes selector choices, map clicks, and swapping through App state", () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Show Region A regions" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Region A" }), { target: { value: "FI1B" } });
  fireEvent.click(screen.getByRole("option", { name: /Helsinki-Uusimaa, Finland/ }));

  expect(screen.getByTestId("map-selection")).toHaveTextContent("FI1B|");
  expect(screen.getByRole("combobox", { name: "Region A" })).toHaveValue("Helsinki-Uusimaa, Finland");

  fireEvent.click(screen.getByRole("button", { name: "Click SE11" }));
  expect(screen.getByTestId("map-selection")).toHaveTextContent("FI1B|SE11");
  expect(screen.getByRole("combobox", { name: "Region B" })).toHaveValue("Stockholm, Sweden");

  fireEvent.click(screen.getByRole("button", { name: "Swap selected regions" }));
  expect(screen.getByTestId("map-selection")).toHaveTextContent("SE11|FI1B");
});

it("uses map clicks to fill, replace, and clear region slots", () => {
  render(<App />);

  fireEvent.click(screen.getByRole("button", { name: "Click FI1B" }));
  fireEvent.click(screen.getByRole("button", { name: "Click SE11" }));
  fireEvent.click(screen.getByRole("button", { name: "Click NO02" }));
  expect(screen.getByTestId("map-selection")).toHaveTextContent("FI1B|NO02");

  fireEvent.click(screen.getByRole("button", { name: "Click FI1B" }));
  expect(screen.getByTestId("map-selection")).toHaveTextContent("|NO02");

  fireEvent.click(screen.getByRole("button", { name: "Click SE11" }));
  expect(screen.getByTestId("map-selection")).toHaveTextContent("SE11|NO02");

  fireEvent.click(screen.getByRole("button", { name: "Click NO02" }));
  expect(screen.getByTestId("map-selection")).toHaveTextContent("SE11|");
});

it("passes the fixed GDP snapshot and its loading/error state to the map", () => {
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
