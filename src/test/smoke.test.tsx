import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { RegionComparison } from "../components/RegionComparison/RegionComparison";

it("renders the starter test environment", () => {
  render(<RegionComparison />);

  expect(screen.getByText("Select two regions to compare.")).toBeInTheDocument();
});
