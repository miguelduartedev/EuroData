import { expect, it } from "vitest";
import { selectMapRegion, setRegionSelection, swapRegionSelections } from "./region-selection";

it("fills Region A, then Region B, then replaces Region B from map clicks", () => {
  const noneSelected = { regionAId: undefined, regionBId: undefined };
  const firstSelected = selectMapRegion(noneSelected, "FI1B");
  const secondSelected = selectMapRegion(firstSelected, "SE11");
  const thirdSelected = selectMapRegion(secondSelected, "NO02");

  expect(firstSelected).toEqual({ regionAId: "FI1B", regionBId: undefined });
  expect(secondSelected).toEqual({ regionAId: "FI1B", regionBId: "SE11" });
  expect(thirdSelected).toEqual({ regionAId: "FI1B", regionBId: "NO02" });
});

it("clears the clicked slot and fills Region A when only Region B exists", () => {
  const selections = { regionAId: "FI1B", regionBId: "SE11" };

  expect(selectMapRegion(selections, "FI1B")).toEqual({ regionAId: undefined, regionBId: "SE11" });
  expect(selectMapRegion(selections, "SE11")).toEqual({ regionAId: "FI1B", regionBId: undefined });
  expect(selectMapRegion({ regionAId: undefined, regionBId: "SE11" }, "NO02")).toEqual({
    regionAId: "NO02",
    regionBId: "SE11",
  });
});

it("clears individual slots, prevents duplicate combobox values, and swaps slots", () => {
  const selections = { regionAId: "FI1B", regionBId: "SE11" };

  expect(setRegionSelection(selections, "regionAId", undefined)).toEqual({
    regionAId: undefined,
    regionBId: "SE11",
  });
  expect(setRegionSelection(selections, "regionAId", "SE11")).toBe(selections);
  expect(swapRegionSelections(selections)).toEqual({ regionAId: "SE11", regionBId: "FI1B" });
});
