import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MapControls } from "./MapControls";
import type { MetricDefinition } from "@/types/metric";

const metrics: Pick<MetricDefinition, "id" | "label">[] = [
  {
    id: "gdp_per_capita",
    label: "GDP per capita",
  },
];

afterEach(cleanup);

it("renders searchable metric and year controls with the default selections", () => {
  render(
    <MapControls
      metrics={metrics}
      metricId="gdp_per_capita"
      onMetricChange={vi.fn()}
      years={[2024, 2023, 2022]}
      year={2023}
      onYearChange={vi.fn()}
    />,
  );

  expect(screen.getByRole("combobox", { name: "Metric" })).toHaveValue("GDP per capita");
  expect(screen.getByRole("combobox", { name: "Year" })).toHaveValue("2023");
  expect(screen.getByText("Coming soon")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Region level" })).toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Region level" })).toHaveValue("NUTS 2");
});

it("filters metric and year options, then supports keyboard year selection", () => {
  const onMetricChange = vi.fn();
  const onYearChange = vi.fn();
  render(
    <MapControls
      metrics={metrics}
      metricId="gdp_per_capita"
      onMetricChange={onMetricChange}
      years={[2024, 2023, 2022]}
      year={2023}
      onYearChange={onYearChange}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Show Metric options" }));
  const metricInput = screen.getByRole("combobox", { name: "Metric" });
  fireEvent.change(metricInput, { target: { value: "GDP" } });
  expect(screen.getByRole("option", { name: "GDP per capita" })).toBeInTheDocument();
  fireEvent.keyDown(metricInput, { key: "Escape" });

  fireEvent.click(screen.getByRole("button", { name: "Show Year options" }));
  const yearInput = screen.getByRole("combobox", { name: "Year" });
  fireEvent.change(yearInput, { target: { value: "2024" } });
  expect(screen.getByRole("option", { name: "2024" })).toBeInTheDocument();
  fireEvent.keyDown(yearInput, { key: "ArrowDown" });
  fireEvent.keyDown(yearInput, { key: "Enter" });

  expect(onMetricChange).not.toHaveBeenCalled();
  expect(onYearChange).toHaveBeenCalledWith(2024);
});

it("disables the Year control and provides loading guidance while years load", () => {
  render(
    <MapControls
      metrics={metrics}
      metricId="gdp_per_capita"
      onMetricChange={vi.fn()}
      years={[2023]}
      year={2023}
      onYearChange={vi.fn()}
      isYearLoading
    />,
  );

  expect(screen.getByRole("combobox", { name: "Year" })).toBeDisabled();
  expect(screen.getByTitle("Loading available years")).toBeInTheDocument();
  expect(screen.queryByText("Loading available years…")).not.toBeInTheDocument();
});
