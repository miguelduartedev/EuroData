import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { getMetricDefinition } from "@/data/metrics";
import { metricDistribution } from "@/lib/metric-exploration";
import { RegionalDistribution } from "./RegionalDistribution";

afterEach(cleanup);

it("renders configured legend labels, colours, and map-comparable region count", () => {
  const metric = getMetricDefinition("gdp_per_capita");
  const bands = metricDistribution([
    { regionId: "PT20", value: 19_000 },
    { regionId: "FI1B", value: 50_000 },
  ], metric.choropleth, metric.valueFormat);
  const { container } = render(<RegionalDistribution
    metric={metric}
    year={2024}
    bands={bands}
    total={2}
    isLoading={false}
    isError={false}
    hasData
  />);

  expect(screen.getByRole("img", { name: "Regional distribution for GDP per capita (PPS) in 2024" })).toBeInTheDocument();
  expect(screen.getByText("2 regions with data")).toBeInTheDocument();
  expect(container.querySelector('rect[fill="#D96D24"]')).toBeInTheDocument();
  expect(container.querySelector('rect[fill="#5878B5"]')).toBeInTheDocument();
  expect(screen.getByText("Regions")).toHaveAttribute("x", "34");
  expect(screen.getByText("Regions")).toHaveAttribute("y", "10");
  expect(screen.getByText("Regions")).toHaveAttribute("text-anchor", "start");
});

it("handles loading and empty data without chart values", () => {
  const metric = getMetricDefinition("gdp_growth");
  const { rerender } = render(<RegionalDistribution metric={metric} year={2024} bands={[]} total={0} isLoading isError={false} hasData={false} />);
  expect(screen.getByLabelText("Loading regional distribution")).toBeInTheDocument();
  rerender(<RegionalDistribution metric={metric} year={2024} bands={[]} total={0} isLoading={false} isError={false} hasData />);
  expect(screen.getByText("No data available")).toBeInTheDocument();
});
