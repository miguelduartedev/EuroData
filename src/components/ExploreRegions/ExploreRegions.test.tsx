import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { getMetricDefinition } from "@/data/metrics";
import { ExploreRegions } from "./ExploreRegions";

afterEach(cleanup);

const metadata = new Map([
  ["FI1B", { id: "FI1B", name: "Helsinki-Uusimaa", countryName: "Finland" }],
  ["PT20", { id: "PT20", name: "Região Autónoma dos Açores", countryName: "Portugal" }],
  ["ES51", { id: "ES51", name: "Cataluña", countryName: "Spain" }],
]);

it("shows numeric highest and lowest regions and reuses the supplied selection callback", () => {
  const onRegionClick = vi.fn();
  render(<ExploreRegions
    metric={getMetricDefinition("gdp_per_capita")}
    year={2024}
    values={[{ regionId: "FI1B", value: 50_000 }, { regionId: "PT20", value: 19_000 }, { regionId: "ES51", value: 30_000 }]}
    metadata={metadata}
    onRegionClick={onRegionClick}
    isLoading={false}
    isError={false}
    hasData
  />);

  expect(screen.getByText("Helsinki-Uusimaa")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Helsinki-Uusimaa/ }));
  expect(onRegionClick).toHaveBeenCalledWith("FI1B");

  fireEvent.click(screen.getByRole("button", { name: "Lowest" }));
  expect(screen.getByText("Região Autónoma dos Açores")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Região Autónoma dos Açores");
});

it("renders a safe empty state", () => {
  render(<ExploreRegions metric={getMetricDefinition("unemployment_rate")} year={2024} values={[]} metadata={metadata} onRegionClick={vi.fn()} isLoading={false} isError={false} hasData />);
  expect(screen.getByText("No data available")).toBeInTheDocument();
});

function paginatedValues(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    regionId: `R${String(index + 1).padStart(2, "0")}`,
    value: count - index,
  }));
}

it("paginates five regions at a time with first, previous, next, and last controls", () => {
  render(<ExploreRegions
    metric={getMetricDefinition("gdp_per_capita")}
    year={2024}
    values={paginatedValues(12)}
    metadata={metadata}
    onRegionClick={vi.fn()}
    isLoading={false}
    isError={false}
    hasData
  />);

  expect(screen.getAllByRole("listitem")).toHaveLength(5);
  expect(screen.getByLabelText("Page 1 of 3")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "First page" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Next page" })).not.toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByLabelText("Page 2 of 3")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("R06");
  fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
  expect(screen.getByLabelText("Page 1 of 3")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Last page" }));
  expect(screen.getByLabelText("Page 3 of 3")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("R11");
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Last page" })).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "First page" }));
  expect(screen.getByLabelText("Page 1 of 3")).toBeInTheDocument();
});

it("resets pagination when switching order, metric, or year", () => {
  const values = paginatedValues(10);
  const { rerender } = render(<ExploreRegions metric={getMetricDefinition("gdp_per_capita")} year={2024} values={values} metadata={metadata} onRegionClick={vi.fn()} isLoading={false} isError={false} hasData />);

  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByLabelText("Page 2 of 2")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Lowest" }));
  expect(screen.getByLabelText("Page 1 of 2")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  rerender(<ExploreRegions metric={getMetricDefinition("unemployment_rate")} year={2024} values={values} metadata={metadata} onRegionClick={vi.fn()} isLoading={false} isError={false} hasData />);
  expect(screen.getByLabelText("Page 1 of 2")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  rerender(<ExploreRegions metric={getMetricDefinition("unemployment_rate")} year={2023} values={values} metadata={metadata} onRegionClick={vi.fn()} isLoading={false} isError={false} hasData />);
  expect(screen.getByLabelText("Page 1 of 2")).toBeInTheDocument();
});
