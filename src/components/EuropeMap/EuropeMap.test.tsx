import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { FeatureCollection } from "geojson";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { gdpChoroplethScale } from "../../data/map-metric";
import { choroplethExpression, NO_DATA_COLORS, type MapMetric } from "../../lib/choropleth";
import { REGION_A_COLOR, REGION_B_COLOR } from "../../lib/region-colors";
import { EuropeMap } from "./EuropeMap";

const mapMock = vi.hoisted(() => {
  const sources = new Map<string, { data: FeatureCollection; setData: ReturnType<typeof vi.fn> }>();
  const layers = new Map<string, unknown>();
  const popup = {
    setDOMContent: vi.fn(), setLngLat: vi.fn(), addTo: vi.fn(), remove: vi.fn(),
  };
  const instance = {
    addControl: vi.fn(), addLayer: vi.fn(), addSource: vi.fn(), fitBounds: vi.fn(),
    getCanvas: vi.fn(() => ({ style: {} })), getLayer: vi.fn(), getSource: vi.fn(),
    isStyleLoaded: vi.fn(() => true), on: vi.fn(), once: vi.fn(), remove: vi.fn(),
    resize: vi.fn(), setPaintProperty: vi.fn(), setFilter: vi.fn(),
    jumpTo: vi.fn(), easeTo: vi.fn(), flyTo: vi.fn(),
  };
  return { instance, popup, sources, layers };
});

vi.mock("maplibre-gl", () => ({
  Map: class {
    constructor(options: { style: { layers: Array<{ id: string }> } }) {
      options.style.layers.forEach((layer) => mapMock.layers.set(layer.id, layer));
      return mapMock.instance;
    }
  },
  Popup: class { constructor() { return mapMock.popup; } },
  NavigationControl: class {}, setWorkerUrl: vi.fn(),
}));

const metric: MapMetric = {
  label: "GDP per capita", unit: "PPS per inhabitant", year: 2023,
  values: new Map([["FI1B", 50400], ["PT20", 27200]]), scale: gdpChoroplethScale,
  isLoading: false, isError: false,
};
const loadingMetric: MapMetric = { ...metric, values: new Map(), isLoading: true };

function emit(eventName: string, regionId = "FI1B", properties = {}) {
  const handler = mapMock.instance.on.mock.calls.find(([event]) => event === eventName)?.[2];
  expect(handler).toBeTypeOf("function");
  const event = {
    features: [{ properties: { NUTS_ID: regionId, ...properties } }],
    lngLat: { lng: 24.9, lat: 60.2 }, originalEvent: { preventDefault: vi.fn() },
  };
  act(() => handler(event));
  return event;
}

function emitMapInteraction(eventName: string) {
  const handler = mapMock.instance.on.mock.calls.find(([event, listener]) =>
    event === eventName && typeof listener === "function",
  )?.[1];
  expect(handler).toBeTypeOf("function");
  act(() => handler());
}

function sourceValues() {
  return mapMock.sources.get("nuts-regions")?.data.features.map((feature) => feature.properties?.metricValue);
}

const europeFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { NUTS_ID: "FI1B", CNTR_CODE: "FI", LEVL_CODE: 2 },
      geometry: {
        type: "Polygon",
        coordinates: [[[22.7, 59.8], [26.5, 59.8], [26.5, 60.8], [22.7, 59.8]]],
      },
    },
    {
      type: "Feature",
      properties: { NUTS_ID: "PT20", CNTR_CODE: "PT", LEVL_CODE: 2 },
      geometry: {
        type: "MultiPolygon",
        coordinates: [[[[ -31.4, 37.5], [-25, 37.5], [-25, 40.2], [-31.4, 37.5]]]],
      },
    },
  ],
};

const ukContextFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { CNTR_ID: "UK", CNTR_NAME: "United Kingdom" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [[[[ -8.6, 49.8], [1.8, 49.8], [1.8, 59], [-8.6, 49.8]]]],
      },
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mapMock.sources.clear();
  mapMock.layers.clear();
  document.documentElement.classList.remove("dark");
  mapMock.instance.getSource.mockImplementation((id: string) => mapMock.sources.get(id));
  mapMock.instance.getLayer.mockImplementation((id: string) => mapMock.layers.get(id));
  mapMock.instance.addLayer.mockImplementation((layer) => mapMock.layers.set(layer.id, layer));
  mapMock.instance.addSource.mockImplementation((id, options) => {
    const source = { data: options.data, setData: vi.fn() };
    source.setData.mockImplementation(async (data) => { source.data = data; });
    mapMock.sources.set(id, source);
  });
  for (const fn of Object.values(mapMock.popup)) fn.mockReturnValue(mapMock.popup);
  vi.stubGlobal("fetch", vi.fn((url: unknown) => Promise.resolve({
    ok: true,
    json: async () => String(url).includes("uk-country") ? ukContextFeatureCollection : europeFeatureCollection,
  })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.classList.remove("dark");
});

it("loads joined geometry and a shared legend while keeping UK context neutral", async () => {
  render(<EuropeMap metric={metric} />);
  await waitFor(() => expect(sourceValues()).toEqual([50400, 27200]));
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(mapMock.sources.get("uk-context")?.data).toBe(ukContextFeatureCollection);
  expect(mapMock.layers.get("uk-context-fill")).toMatchObject({ paint: { "fill-color": "#e2e8f0" } });
  expect(mapMock.layers.get("nuts-regions-fill")).toMatchObject({ paint: {
    "fill-color": choroplethExpression(metric.scale, NO_DATA_COLORS.light), "fill-opacity": 1,
  } });
  expect(screen.getByRole("region", { name: "Map legend" })).toHaveTextContent("GDP per capita · 2023");
  expect(screen.getByText("PPS per inhabitant")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(7);
  expect(screen.getByText("No data")).toBeInTheDocument();
  expect(screen.getByLabelText("Geographic data attribution")).toHaveTextContent(
    "Eurostat / GISCO · © EuroGeographics for the administrative boundaries",
  );
  expect(screen.getByRole("link", { name: "Eurostat / GISCO" })).toHaveAttribute(
    "href", "https://ec.europa.eu/eurostat/en/web/gisco/geodata/statistical-units",
  );
  expect(mapMock.instance.on.mock.calls.some(([, layerId]) => layerId === "uk-context-fill")).toBe(false);
  expect(mapMock.instance.fitBounds).toHaveBeenCalledWith([[-12, 34], [36, 72]], expect.objectContaining({ duration: 0 }));
  expect(europeFeatureCollection.features[0].properties).not.toHaveProperty("metricValue");
});

it("allows clicks while loading, then updates source data without recreating or refitting the map", async () => {
  const onRegionClick = vi.fn();
  const { rerender } = render(<EuropeMap metric={loadingMetric} onRegionClick={onRegionClick} />);
  await waitFor(() => expect(sourceValues()).toEqual([null, null]));
  expect(screen.getByRole("status")).toHaveTextContent("Loading data");
  emit("click", "PT20");
  expect(onRegionClick).toHaveBeenCalledWith("PT20");
  rerender(<EuropeMap metric={metric} onRegionClick={onRegionClick} />);
  await waitFor(() => expect(sourceValues()).toEqual([50400, 27200]));
  expect(mapMock.sources.get("nuts-regions")?.setData).toHaveBeenCalledTimes(1);
  expect(mapMock.instance.addSource).toHaveBeenCalledTimes(2);
  expect(mapMock.instance.fitBounds).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("keeps the viewport unchanged when selection props update", async () => {
  const { rerender } = render(<EuropeMap metric={metric} />);
  await waitFor(() => expect(mapMock.layers.has("nuts-selection-outline")).toBe(true));
  expect(mapMock.instance.fitBounds).toHaveBeenCalledTimes(1);

  rerender(<EuropeMap metric={metric} regionAId="FI1B" regionBId="PT20" />);

  expect(mapMock.instance.fitBounds).toHaveBeenCalledTimes(1);
  expect(mapMock.instance.jumpTo).not.toHaveBeenCalled();
  expect(mapMock.instance.easeTo).not.toHaveBeenCalled();
  expect(mapMock.instance.flyTo).not.toHaveBeenCalled();
});

it("does not apply the delayed initial fit after a user viewport interaction", async () => {
  let resolveGeometry!: (value: unknown) => void;
  const geometryResponse = new Promise((resolve) => { resolveGeometry = resolve; });
  vi.stubGlobal("fetch", vi.fn((url: unknown) => String(url).includes("uk-country")
    ? Promise.resolve({ ok: true, json: async () => ukContextFeatureCollection }) : geometryResponse));

  render(<EuropeMap metric={metric} />);
  emitMapInteraction("mousedown");
  await act(async () => resolveGeometry({ ok: true, json: async () => europeFeatureCollection }));

  await waitFor(() => expect(mapMock.sources.has("nuts-regions")).toBe(true));
  expect(mapMock.instance.fitBounds).not.toHaveBeenCalled();
});

it("resizes for container layout changes without refitting the viewport", async () => {
  let notifyResize: (() => void) | undefined;
  const observe = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) {
      notifyResize = callback;
    }
    observe = observe;
    disconnect = disconnect;
  });

  const { unmount } = render(<EuropeMap metric={metric} />);
  await waitFor(() => expect(mapMock.instance.fitBounds).toHaveBeenCalledTimes(1));
  expect(observe).toHaveBeenCalledOnce();

  act(() => notifyResize?.());

  expect(mapMock.instance.resize).toHaveBeenCalled();
  expect(mapMock.instance.fitBounds).toHaveBeenCalledTimes(1);
  expect(mapMock.instance.jumpTo).not.toHaveBeenCalled();
  expect(mapMock.instance.easeTo).not.toHaveBeenCalled();
  expect(mapMock.instance.flyTo).not.toHaveBeenCalled();
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});

it("uses the latest metric when data arrives before deferred geometry", async () => {
  let resolveGeometry!: (value: unknown) => void;
  const geometryResponse = new Promise((resolve) => { resolveGeometry = resolve; });
  vi.stubGlobal("fetch", vi.fn((url: unknown) => String(url).includes("uk-country")
    ? Promise.resolve({ ok: true, json: async () => ukContextFeatureCollection }) : geometryResponse));
  const { rerender } = render(<EuropeMap metric={loadingMetric} />);
  rerender(<EuropeMap metric={metric} />);
  await act(async () => resolveGeometry({ ok: true, json: async () => europeFeatureCollection }));
  await waitFor(() => expect(sourceValues()).toEqual([50400, 27200]));
});

it("keeps selection on coloured outlines without replacing the GDP fill", async () => {
  const onRegionClick = vi.fn();
  const { rerender } = render(<EuropeMap metric={metric} regionAId="FI1B" regionBId="PT20" onRegionClick={onRegionClick} />);
  await waitFor(() => expect(mapMock.layers.has("nuts-selection-outline")).toBe(true));
  expect(mapMock.layers.get("nuts-selection-halo")).toMatchObject({ paint: { "line-color": "#ffffff", "line-width": 6 } });
  expect(mapMock.layers.get("nuts-selection-outline")).toMatchObject({ paint: {
    "line-color": ["case", ["==", ["get", "NUTS_ID"], "FI1B"], REGION_A_COLOR, REGION_B_COLOR],
  } });
  emit("click", "PT20");
  const context = emit("contextmenu", "PT20");
  expect(context.originalEvent.preventDefault).toHaveBeenCalledOnce();
  expect(onRegionClick).toHaveBeenCalledTimes(2);
  rerender(<EuropeMap metric={metric} regionAId="PT20" regionBId="FI1B" onRegionClick={onRegionClick} />);
  expect(mapMock.instance.setPaintProperty).toHaveBeenCalledWith("nuts-selection-outline", "line-color",
    ["case", ["==", ["get", "NUTS_ID"], "PT20"], REGION_A_COLOR, REGION_B_COLOR]);
  expect(mapMock.instance.setFilter).toHaveBeenCalledWith("nuts-selection-outline", ["any",
    ["==", ["get", "NUTS_ID"], "PT20"], ["==", ["get", "NUTS_ID"], "FI1B"]]);
  expect(mapMock.instance.setPaintProperty.mock.calls.filter(([layer, prop]) => layer === "nuts-regions-fill" && prop === "fill-color")
    .every(([, , expression]) => JSON.stringify(expression) === JSON.stringify(choroplethExpression(metric.scale, NO_DATA_COLORS.light)))).toBe(true);
});

it("shows safe hover content and refreshes it when data arrives, without selecting", async () => {
  const onRegionClick = vi.fn();
  const { rerender, unmount } = render(<EuropeMap metric={loadingMetric} onRegionClick={onRegionClick} />);
  await waitFor(() => expect(mapMock.sources.has("nuts-regions")).toBe(true));
  emit("mousemove", "FI1B", { NAME_LATN: "Helsinki-Uusimaa" });
  expect(mapMock.popup.setDOMContent.mock.lastCall?.[0].textContent).toContain("Loading data");
  rerender(<EuropeMap metric={metric} onRegionClick={onRegionClick} />);
  expect(mapMock.popup.setDOMContent.mock.lastCall?.[0].textContent).toBe("Helsinki-Uusimaa (FI1B)50,400PPS per inhabitant · 2023");
  emit("mousemove", "ES70", { NAME_LATN: "<img src=x onerror=alert(1)>" });
  const content = mapMock.popup.setDOMContent.mock.lastCall?.[0] as HTMLElement;
  expect(content.textContent).toContain("No data");
  expect(content.querySelector("img")).toBeNull();
  expect(onRegionClick).not.toHaveBeenCalled();
  emit("mouseleave");
  expect(mapMock.popup.remove).toHaveBeenCalledOnce();
  unmount();
  expect(mapMock.popup.remove).toHaveBeenCalledTimes(2);
  expect(mapMock.instance.remove).toHaveBeenCalledOnce();
});

it("retains geometry on failure and preserves cached colours on refresh failure", async () => {
  const { rerender } = render(<EuropeMap metric={{ ...loadingMetric, isLoading: false, isError: true }} />);
  await waitFor(() => expect(sourceValues()).toEqual([null, null]));
  expect(screen.getByRole("status")).toHaveTextContent("Data unavailable");
  rerender(<EuropeMap metric={{ ...metric, isError: true }} />);
  expect(sourceValues()).toEqual([50400, 27200]);
  expect(screen.getByRole("status")).toHaveTextContent("Showing cached values");
});

it("keeps the choropleth scale while updating neutral colours and legend for dark mode", async () => {
  render(<EuropeMap metric={metric} />);
  await waitFor(() => expect(mapMock.layers.has("nuts-regions-fill")).toBe(true));
  act(() => document.documentElement.classList.add("dark"));
  await waitFor(() => expect(mapMock.instance.setPaintProperty).toHaveBeenCalledWith("water-background", "background-color", "#0b1f2a"));
  expect(mapMock.instance.setPaintProperty).toHaveBeenCalledWith("nuts-regions-fill", "fill-color", choroplethExpression(metric.scale, NO_DATA_COLORS.dark));
  expect(mapMock.instance.setPaintProperty).toHaveBeenCalledWith("uk-context-fill", "fill-color", "#334155");
  expect(screen.getByText("No data").previousElementSibling).toHaveStyle({ backgroundColor: NO_DATA_COLORS.dark });
});
