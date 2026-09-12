import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { RegionComparison } from "./RegionComparison";

afterEach(cleanup);

it("keeps the key metrics area as a metric placeholder", () => {
  render(<RegionComparison />);

  expect(screen.getByRole("heading", { name: "Key metrics" })).toBeInTheDocument();
  expect(screen.getByText("Key metrics comparison will appear here.")).toBeInTheDocument();
  expect(screen.queryByLabelText("Region A selection")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Region B selection")).not.toBeInTheDocument();
});
