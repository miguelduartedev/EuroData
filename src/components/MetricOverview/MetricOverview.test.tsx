import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MetricOverview } from "./MetricOverview";
import { metrics } from "@/data/metrics";
import { summarizeMetric } from "@/lib/metric-summary";

afterEach(cleanup);

const props = {
  metric: metrics[0], year: 2023,
  summary: { average: 25000, highest: { regionId: "FI1B", value: 50000 }, lowest: { regionId: "PT20", value: 0 }, count: 2 },
  regionNames: new Map([["FI1B", "Helsinki-Uusimaa"]]),
  isLoading: false, isError: false, hasData: true,
};

it("renders values, units, GISCO names, ID fallback, year and an accessible average tooltip", async () => {
  render(<MetricOverview {...props} />);
  expect(screen.getByText("25,000")).toBeInTheDocument();
  expect(screen.getByText("50,000")).toBeInTheDocument();
  expect(screen.getByText("0")).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();
  expect(screen.getByText("PPS per inhabitant")).toBeInTheDocument();
  expect(screen.getByText("Helsinki-Uusimaa (FI1B)")).toBeInTheDocument();
  expect(screen.getByText("PT20")).toBeInTheDocument();
  expect(screen.getByLabelText("Selected year: 2023")).toBeInTheDocument();
  fireEvent.focus(screen.getByRole("button", { name: "About regional average" }));
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Unweighted average of regions with available data.");
});

it("shows stable placeholders while loading and an unavailable state on failure", () => {
  const { rerender } = render(<MetricOverview {...props} isLoading hasData={false} />);
  expect(screen.getByLabelText("Loading regional average")).toBeInTheDocument();
  expect(screen.getByLabelText("Loading total regions")).toBeInTheDocument();
  expect(screen.queryByText("25,000")).not.toBeInTheDocument();
  rerender(<MetricOverview {...props} isError hasData={false} />);
  expect(screen.getByRole("status")).toHaveTextContent("Metric data is currently unavailable.");
  expect(screen.getAllByText("—")).toHaveLength(4);
});

it("retains cached statistics when a refresh fails", () => {
  render(<MetricOverview {...props} isError />);
  expect(screen.getByText("25,000")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Showing the last available snapshot.");
});

it("renders an empty snapshot as no data with zero valid regions", () => {
  render(<MetricOverview {...props} summary={summarizeMetric([], "gdp_per_capita", 2023, new Set())} />);
  expect(screen.getAllByText("No data")).toHaveLength(3);
  expect(screen.getByText("0")).toBeInTheDocument();
  expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
});
