import { render, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { NordicMap } from "./NordicMap";

const mapMock = vi.hoisted(() => {
  class LngLatBounds {
    private empty = true;

    extend() {
      this.empty = false;
      return this;
    }

    isEmpty() {
      return this.empty;
    }
  }

  const instance = {
    addControl: vi.fn(),
    addLayer: vi.fn(),
    addSource: vi.fn(),
    fitBounds: vi.fn(),
    getCanvas: vi.fn(() => ({ style: {} })),
    getLayer: vi.fn(),
    getSource: vi.fn(),
    isStyleLoaded: vi.fn(() => true),
    on: vi.fn(),
    once: vi.fn(),
    remove: vi.fn(),
    setPaintProperty: vi.fn(),
  };

  return { instance, LngLatBounds };
});

vi.mock("maplibre-gl", () => ({
  LngLatBounds: mapMock.LngLatBounds,
  Map: class {
    constructor() {
      return mapMock.instance;
    }
  },
  NavigationControl: class {},
  setWorkerUrl: vi.fn(),
}));

const nordicFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { NUTS_ID: "FI1B", CNTR_CODE: "FI" },
      geometry: {
        type: "Polygon",
        coordinates: [[[22.7, 59.8], [26.5, 59.8], [26.5, 60.8], [22.7, 59.8]]],
      },
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => nordicFeatureCollection,
    }),
  );
});

it("loads Nordic NUTS geometry into fill and outline layers", async () => {
  const onRegionClick = vi.fn();
  render(<NordicMap selectedRegionIds={["FI1B"]} onRegionClick={onRegionClick} />);

  await waitFor(() => {
    expect(mapMock.instance.addSource).toHaveBeenCalledWith(
      "nuts-regions",
      expect.objectContaining({ data: nordicFeatureCollection, promoteId: "NUTS_ID", type: "geojson" }),
    );
  });

  expect(mapMock.instance.addLayer).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({ id: "nuts-regions-fill", source: "nuts-regions", type: "fill" }),
  );
  expect(mapMock.instance.addLayer).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({ id: "nuts-regions-outline", source: "nuts-regions", type: "line" }),
  );
  expect(mapMock.instance.fitBounds).toHaveBeenCalledTimes(1);

  const clickHandler = mapMock.instance.on.mock.calls.find(([eventName]) => eventName === "click")?.[2];
  expect(clickHandler).toBeTypeOf("function");
  (clickHandler as (event: { features: Array<{ properties: { NUTS_ID: string } }> }) => void)({
    features: [{ properties: { NUTS_ID: "FI1B" } }],
  });

  expect(onRegionClick).toHaveBeenCalledWith("FI1B");
});
