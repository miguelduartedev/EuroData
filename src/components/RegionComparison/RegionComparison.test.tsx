import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { metrics } from "@/data/metrics";
import { REGION_A_COLOR, REGION_B_COLOR } from "@/lib/region-colors";
import { RegionComparison } from "./RegionComparison";

afterEach(cleanup);

const regions = [
  {
    slot: "Region A" as const,
    metadata: { id: "FI1B", name: "Helsinki-Uusimaa", countryCode: "FI", countryName: "Finland" },
    color: REGION_A_COLOR,
    value: 50000,
    rank: { position: 2, total: 276 },
    trend: [{ year: 2013, value: 30000 }, { year: 2019, value: 40000 }, { year: 2020, value: null }, { year: 2023, value: 50000 }],
  },
  {
    slot: "Region B" as const,
    metadata: { id: "PT20", name: "Região Autónoma dos Açores", countryCode: "PT", countryName: "Portugal" },
    color: REGION_B_COLOR,
    value: 25000,
    rank: { position: 181, total: 276 },
    trend: [{ year: 2013, value: 20000 }, { year: 2019, value: 24000 }, { year: 2020, value: 23000 }, { year: 2023, value: 25000 }],
  },
] as const;

const props = {
  metric: metrics[0],
  year: 2023,
  regions,
  isSnapshotLoading: false,
  isSnapshotError: false,
  hasSnapshotData: true,
  isHistoryLoading: false,
  isHistoryError: false,
  hasHistoryData: true,
  onClear: vi.fn(),
};

it("renders generic region cards with flags, current values, ranks and a neutral difference", () => {
  render(<RegionComparison {...props} />);

  expect(screen.getByRole("heading", { name: "Comparing 2 regions" })).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Flag of Finland" })).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Flag of Portugal" })).toBeInTheDocument();
  expect(screen.getByLabelText("Region A: Helsinki-Uusimaa")).toHaveTextContent("50,000");
  expect(screen.getByLabelText("Region A: Helsinki-Uusimaa")).toHaveTextContent("2 / 276");
  expect(screen.getByLabelText("Region B: Região Autónoma dos Açores")).toHaveTextContent("25,000");
  expect(screen.getByLabelText("Region B: Região Autónoma dos Açores")).toHaveTextContent("181 / 276");
  expect(screen.getByText(`25,000 ${metrics[0].unit}`)).toBeInTheDocument();
  expect(screen.getByText("+100%")).toBeInTheDocument();
  expect(screen.getByText("Helsinki-Uusimaa relative to Região Autónoma dos Açores")).toBeInTheDocument();
});

it("renders two series, preserves a missing point, and shows both values in the tooltip", () => {
  render(<RegionComparison {...props} />);

  expect(screen.getByRole("img", { name: "GDP per capita (PPS) comparison line chart" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Helsinki-Uusimaa, 2023: 50,000 PPS per inhabitant" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Região Autónoma dos Açores, 2023: 25,000 PPS per inhabitant" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Helsinki-Uusimaa, 2020/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Região Autónoma dos Açores, 2020: 23,000 PPS per inhabitant" })).toBeInTheDocument();

  fireEvent.mouseEnter(screen.getByRole("button", { name: "Helsinki-Uusimaa, 2023: 50,000 PPS per inhabitant" }));
  expect(screen.getByRole("tooltip")).toHaveTextContent(/2023.*Helsinki-Uusimaa.*50,000.*Região Autónoma dos Açores.*25,000/);
});

it("shares one range and recalculates each region's period change client-side", () => {
  render(<RegionComparison {...props} />);
  const start = screen.getByRole("combobox", { name: "Trend start year" });
  expect(start).toHaveValue("2013");
  expect(screen.getByLabelText("Region A: Helsinki-Uusimaa")).toHaveTextContent("+66.7%");
  expect(screen.getByLabelText("Region B: Região Autónoma dos Açores")).toHaveTextContent("+25%");

  fireEvent.change(start, { target: { value: "2019" } });
  expect(start).toHaveValue("2019");
  expect(screen.getByLabelText("Region A: Helsinki-Uusimaa")).toHaveTextContent("+25%");
  expect(screen.getByLabelText("Region B: Região Autónoma dos Açores")).toHaveTextContent("+4.2%");
  expect(screen.queryByRole("button", { name: /2013:/ })).not.toBeInTheDocument();
});

it("clears the comparison through the existing selection callback", () => {
  const onClear = vi.fn();
  render(<RegionComparison {...props} onClear={onClear} />);
  fireEvent.click(screen.getByRole("button", { name: "Clear comparison" }));
  expect(onClear).toHaveBeenCalledOnce();
});
