export interface RegionSelections {
  regionAId: string | undefined;
  regionBId: string | undefined;
}

export type RegionSelectionSlot = keyof RegionSelections;

const otherSlotBySlot: Record<RegionSelectionSlot, RegionSelectionSlot> = {
  regionAId: "regionBId",
  regionBId: "regionAId",
};

export function setRegionSelection(
  selections: RegionSelections,
  slot: RegionSelectionSlot,
  regionId: string | undefined,
): RegionSelections {
  if (regionId === undefined) {
    return { ...selections, [slot]: undefined };
  }

  if (selections[otherSlotBySlot[slot]] === regionId) {
    return selections;
  }

  return { ...selections, [slot]: regionId };
}

export function selectMapRegion(selections: RegionSelections, regionId: string): RegionSelections {
  if (regionId === selections.regionAId) {
    return { ...selections, regionAId: undefined };
  }

  if (regionId === selections.regionBId) {
    return { ...selections, regionBId: undefined };
  }

  if (selections.regionAId === undefined) {
    return { ...selections, regionAId: regionId };
  }

  if (selections.regionBId === undefined) {
    return { ...selections, regionBId: regionId };
  }

  return { ...selections, regionBId: regionId };
}

export function swapRegionSelections(selections: RegionSelections): RegionSelections {
  return {
    regionAId: selections.regionBId,
    regionBId: selections.regionAId,
  };
}
