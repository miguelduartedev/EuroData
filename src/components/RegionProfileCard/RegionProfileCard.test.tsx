import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { regions } from "../../data/regions";
import { REGION_A_COLOR, REGION_B_COLOR } from "../../lib/region-colors";
import { RegionProfileRow } from "./RegionProfileCard";

const helsinkiUusimaa = regions.find((region) => region.id === "FI1B");
const stockholm = regions.find((region) => region.id === "SE11");

afterEach(cleanup);

if (!helsinkiUusimaa || !stockholm) {
  throw new Error("Expected GISCO-backed test regions to be available.");
}

it("renders a full-width selected-region profile with a local flag and placeholder details", () => {
  const { container } = render(
    <RegionProfileRow
      regionA={helsinkiUusimaa}
      regionAColor={REGION_A_COLOR}
      regionBColor={REGION_B_COLOR}
    />,
  );

  const profile = screen.getByLabelText("Region A: Helsinki-Uusimaa");
  expect(profile).toHaveStyle({ borderTopColor: REGION_A_COLOR });
  expect(screen.getByRole("img", { name: "Flag of Finland" })).toBeInTheDocument();
  expect(profile).toHaveTextContent("Finland · FI1B");
  expect(profile).toHaveTextContent("Population");
  expect(profile).toHaveTextContent("Largest city");
  expect(profile).toHaveTextContent("Coming soon");
  expect(container.querySelector("[data-slot='region-profile-divider']")).toBeInTheDocument();
});

it("renders two side-by-side slot profiles when both regions are selected", () => {
  render(
    <RegionProfileRow
      regionA={helsinkiUusimaa}
      regionB={stockholm}
      regionAColor={REGION_A_COLOR}
      regionBColor={REGION_B_COLOR}
    />,
  );

  expect(screen.getByLabelText("Region A: Helsinki-Uusimaa")).toBeInTheDocument();
  expect(screen.getByLabelText("Region B: Stockholm")).toHaveStyle({ borderTopColor: REGION_B_COLOR });
  expect(screen.getByRole("img", { name: "Flag of Sweden" })).toBeInTheDocument();
});
