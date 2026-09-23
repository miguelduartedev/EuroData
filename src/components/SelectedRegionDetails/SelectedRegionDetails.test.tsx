import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SelectedRegionDetails } from "./SelectedRegionDetails";
import { metrics } from "@/data/metrics";
import { REGION_A_COLOR } from "@/lib/region-colors";

afterEach(cleanup);
const props = {
  region: { id: "PT20", name: "Região Autónoma dos Açores", countryName: "Portugal" },
  metric: metrics[0], year: 2023, value: 28100,
  color: REGION_A_COLOR,
  isLoading: false, isError: false, hasData: true,
  trend: [{ year: 2015, value: 22000 }, { year: 2020, value: null }, { year: 2023, value: 28100 }],
  change: { percent: 27.727, sinceYear: 2015 }, rank: { position: 84, total: 276 },
  isHistoryLoading: false, isHistoryError: false, hasHistoryData: true,
};

it.each([null, NaN, Infinity])("shows No data for a missing or invalid value (%s)", (value) => {
  render(<SelectedRegionDetails {...props} value={value} />);
  expect(screen.getByText("No data")).toBeInTheDocument();
});

it("retains numeric zero and displays metadata, unit and year", () => {
  render(<SelectedRegionDetails {...props} value={0} />);
  expect(screen.getByText("0")).toBeInTheDocument();
  expect(screen.getByText("Portugal · PT20")).toBeInTheDocument();
  expect(screen.getByText("PPS per inhabitant · 2023")).toBeInTheDocument();
  expect(screen.getByText("Select another region to compare")).toBeInTheDocument();
  expect(screen.getByText("+27.7%")).toBeInTheDocument();
  expect(screen.getByText("84 / 276")).toBeInTheDocument();
  const chart = screen.getByRole("img", { name: "GDP per capita (PPS) historical line chart" });
  expect(chart).toHaveAttribute("viewBox", "0 0 640 220");
  expect(chart).toHaveClass("h-auto", "w-full");
  expect(chart.querySelector('[data-series-id="PT20"]')).toHaveAttribute("stroke", REGION_A_COLOR);
  expect(within(screen.getByLabelText("GDP per capita (PPS) trend")).getByText("Região Autónoma dos Açores")).toBeInTheDocument();
  const latestPoint = screen.getByRole("button", { name: "Região Autónoma dos Açores, 2023: 28,100 PPS per inhabitant" });
  expect(screen.getByRole("button", { name: "Região Autónoma dos Açores, 2015: 22,000 PPS per inhabitant" })).toBeInTheDocument();
  expect(screen.getByText("2020")).toBeInTheDocument();
  fireEvent.mouseEnter(latestPoint);
  expect(screen.getByRole("tooltip")).toHaveTextContent(/2023.*Região Autónoma dos Açores.*28,100/);
  fireEvent.mouseLeave(latestPoint);
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
});

it("uses a country flag in the region avatar when country metadata is available", () => {
  render(<SelectedRegionDetails {...props} region={{ id: "FI1B", name: "Helsinki-Uusimaa", countryCode: "FI", countryName: "Finland" }} />);

  expect(screen.getByRole("img", { name: "Flag of Finland" })).toBeInTheDocument();
});

it("uses the same local flag treatment for a European GISCO region", () => {
  render(<SelectedRegionDetails {...props} region={{ ...props.region, countryCode: "PT" }} />);

  expect(screen.getByRole("img", { name: "Flag of Portugal" })).toBeInTheDocument();
});

it("filters the chart and change statistic with a valid client-side year range", () => {
  render(<SelectedRegionDetails {...props} trend={[
    { year: 2013, value: 100 }, { year: 2015, value: 200 }, { year: 2020, value: null }, { year: 2023, value: 250 },
  ]} />);

  const fromYear = screen.getByRole("combobox", { name: "Trend start year" });
  const toYear = screen.getByRole("combobox", { name: "Trend end year" });
  expect(fromYear).toHaveValue("2013");
  expect(toYear).toHaveValue("2023");
  expect(screen.getByText("+150%")).toBeInTheDocument();

  fireEvent.change(fromYear, { target: { value: "2015" } });
  expect(fromYear).toHaveValue("2015");
  expect(screen.getByText("+25%")).toBeInTheDocument();
  expect(screen.getByText("since 2015")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Região Autónoma dos Açores, 2013: 100 PPS per inhabitant" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Região Autónoma dos Açores, 2023: 250 PPS per inhabitant" })).toBeInTheDocument();
  expect([...((toYear as HTMLSelectElement).options)].map((option) => option.value)).not.toContain("2013");

  fireEvent.change(toYear, { target: { value: "2013" } });
  expect(Number((fromYear as HTMLSelectElement).value)).toBeLessThanOrEqual(Number((toYear as HTMLSelectElement).value));
});

it("handles initial loading, failure, and refresh failure with cached data", () => {
  const { rerender } = render(<SelectedRegionDetails {...props} isLoading hasData={false} />);
  expect(screen.getByLabelText("Loading selected region value")).toBeInTheDocument();
  expect(screen.queryByText("28,100")).not.toBeInTheDocument();
  rerender(<SelectedRegionDetails {...props} isError hasData={false} />);
  expect(screen.getByRole("status")).toHaveTextContent("Metric data is currently unavailable.");
  expect(screen.getByText("—")).toBeInTheDocument();
  rerender(<SelectedRegionDetails {...props} isError />);
  expect(screen.getByText("28,100")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Showing the last available snapshot.");
});

it("keeps current data visible when trend data loads or fails", () => {
  const { rerender } = render(<SelectedRegionDetails {...props} isHistoryLoading hasHistoryData={false} />);
  expect(screen.getByText("28,100")).toBeInTheDocument();
  expect(screen.getByLabelText("Loading regional trend")).toBeInTheDocument();
  expect(screen.getByLabelText("Loading trend range selectors")).toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Trend start year" })).not.toBeInTheDocument();
  rerender(<SelectedRegionDetails {...props} isHistoryError hasHistoryData={false} trend={[]} />);
  expect(screen.getByText("Trend data is currently unavailable.")).toBeInTheDocument();
  expect(screen.getByText("28,100")).toBeInTheDocument();
});
