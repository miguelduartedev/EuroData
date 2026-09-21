import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { Feature, FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon } from "geojson";
import type { Map as MapLibreMap, MapLayerMouseEvent, StyleSpecification, GeoJSONSource } from "maplibre-gl";
import { REGION_A_COLOR, REGION_B_COLOR } from "@/lib/region-colors";

import { choroplethExpression, joinMetricToGeometry, metricHoverText, NO_DATA_COLORS, type MapMetric } from "@/lib/choropleth";
import { MapLegend } from "./MapLegend";

const SELECTION_HALO_LAYER_ID = "nuts-selection-halo";
const SELECTION_LAYER_ID = "nuts-selection-outline";
const SOURCE_ID = "nuts-regions";
const FILL_LAYER_ID = "nuts-regions-fill";
const OUTLINE_LAYER_ID = "nuts-regions-outline";
const UK_CONTEXT_SOURCE_ID = "uk-context";
const UK_CONTEXT_FILL_LAYER_ID = "uk-context-fill";
const UK_CONTEXT_OUTLINE_LAYER_ID = "uk-context-outline";
const NUTS_ID_PROPERTY = "NUTS_ID";
const EUROPE_NUTS_SOURCE_URL = `${import.meta.env.BASE_URL}data/europe-nuts-2-2024.geojson`;
const UK_CONTEXT_SOURCE_URL = `${import.meta.env.BASE_URL}data/uk-country-2024.geojson`;
const EUROPE_INITIAL_BOUNDS: [[number, number], [number, number]] = [[-12, 34], [36, 72]];
type Nuts2Geometry = Polygon | MultiPolygon;
type CountryGeometry = Polygon | MultiPolygon;

maplibregl.setWorkerUrl(maplibreWorkerUrl);

const WATER_BACKGROUND_LAYER_ID = "water-background";

interface MapPalette {
  water: string;
  contextFill: string;
  contextOutline: string;
  contextOpacity: number;
  regionFill: string;
  regionOutline: string;
}

const lightMapPalette: MapPalette = {
  water: "#e7f3f7",
  contextFill: "#e2e8f0",
  contextOutline: "#94a3b8",
  contextOpacity: 0.94,
  regionFill: NO_DATA_COLORS.light,
  regionOutline: "#64748b",
};

const darkMapPalette: MapPalette = {
  water: "#0b1f2a",
  contextFill: "#334155",
  contextOutline: "#64748b",
  contextOpacity: 0.94,
  regionFill: NO_DATA_COLORS.dark,
  regionOutline: "#94a3b8",
};

export interface NordicMapProps {
  metric: MapMetric;
  regionAId?: string;
  regionBId?: string;
  onRegionClick?: (regionId: string) => void;
}

function isNuts2Feature(feature: unknown): feature is Feature<Nuts2Geometry, GeoJsonProperties> {
  if (!feature || typeof feature !== "object") {
    return false;
  }

  const candidate = feature as Feature;
  const nutsId = candidate.properties?.[NUTS_ID_PROPERTY];
  const level = candidate.properties?.LEVL_CODE;

  return (
    candidate.type === "Feature" &&
    typeof nutsId === "string" &&
    level === 2 &&
    candidate.geometry !== null &&
    (candidate.geometry.type === "Polygon" || candidate.geometry.type === "MultiPolygon")
  );
}

function isNuts2FeatureCollection(value: unknown): value is FeatureCollection<Nuts2Geometry, GeoJsonProperties> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const collection = value as { type?: unknown; features?: unknown };
  const features = Array.isArray(collection.features) ? collection.features : [];
  const nutsIds = features.map((feature) =>
    isNuts2Feature(feature) ? feature.properties?.[NUTS_ID_PROPERTY] : undefined,
  );

  return (
    collection.type === "FeatureCollection" &&
    features.length > 0 &&
    features.every(isNuts2Feature) &&
    new Set(nutsIds).size === features.length
  );
}

function isUkContextFeature(feature: unknown): feature is Feature<CountryGeometry, GeoJsonProperties> {
  if (!feature || typeof feature !== "object") {
    return false;
  }

  const candidate = feature as Feature;

  return (
    candidate.type === "Feature" &&
    candidate.properties?.CNTR_ID === "UK" &&
    candidate.geometry !== null &&
    (candidate.geometry.type === "Polygon" || candidate.geometry.type === "MultiPolygon")
  );
}

function isUkContextFeatureCollection(value: unknown): value is FeatureCollection<CountryGeometry, GeoJsonProperties> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const collection = value as { type?: unknown; features?: unknown };
  const features = Array.isArray(collection.features) ? collection.features : [];

  return collection.type === "FeatureCollection" && features.length > 0 && features.every(isUkContextFeature);
}

function mapPalette(isDarkMode: boolean): MapPalette {
  return isDarkMode ? darkMapPalette : lightMapPalette;
}

function createMapStyle(palette: MapPalette): StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: WATER_BACKGROUND_LAYER_ID,
        type: "background",
        paint: { "background-color": palette.water },
      },
    ],
  };
}

function selectionFilter(regionAId?: string, regionBId?: string): maplibregl.ExpressionSpecification {
  return ["any",
    ["==", ["get", NUTS_ID_PROPERTY], regionAId ?? ""],
    ["==", ["get", NUTS_ID_PROPERTY], regionBId ?? ""],
  ];
}

function selectionColor(regionAId?: string): maplibregl.ExpressionSpecification {
  return ["case", ["==", ["get", NUTS_ID_PROPERTY], regionAId ?? ""], REGION_A_COLOR, REGION_B_COLOR];
}

function updateHoverPopup(popup: maplibregl.Popup, properties: GeoJsonProperties, metric: MapMetric): void {
  const content = document.createElement("div");
  metricHoverText(properties, metric).forEach((text, index) => {
    const line = document.createElement(index === 0 ? "strong" : "div");
    line.textContent = text;
    content.appendChild(line);
  });
  popup.setDOMContent(content);
}

function fitEuropeanBounds(map: MapLibreMap): void {
  map.fitBounds(EUROPE_INITIAL_BOUNDS, {
    padding: { top: 46, right: 36, bottom: 46, left: 36 },
    maxZoom: 4.2,
    duration: 0,
  });
}

function addRegionLayers(
  map: MapLibreMap,
  data: FeatureCollection<Nuts2Geometry, GeoJsonProperties>,
  metric: MapMetric,
  regionAId: string | undefined,
  regionBId: string | undefined,
  palette: MapPalette,
): void {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, { type: "geojson", data, promoteId: NUTS_ID_PROPERTY });
  }

  if (!map.getLayer(FILL_LAYER_ID)) {
    map.addLayer({
      id: FILL_LAYER_ID,
      type: "fill",
      source: SOURCE_ID,
      paint: {
        "fill-color": choroplethExpression(metric.scale, palette.regionFill),
        "fill-opacity": 1,
        "fill-color-transition": { duration: 0 },
      },
    });
  }

  if (!map.getLayer(OUTLINE_LAYER_ID)) {
    map.addLayer({
      id: OUTLINE_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      paint: { "line-color": palette.regionOutline, "line-width": 0.6 },
    });
  }
  for (const [id, width, color] of [
    [SELECTION_HALO_LAYER_ID, 6, "#ffffff"],
    [SELECTION_LAYER_ID, 3, selectionColor(regionAId)],
  ] as const) {
    if (!map.getLayer(id)) {
      map.addLayer({
        id, type: "line", source: SOURCE_ID,
        filter: selectionFilter(regionAId, regionBId),
        paint: { "line-color": color, "line-width": width },
      });
    }
  }
}

function addUkContextLayers(
  map: MapLibreMap,
  data: FeatureCollection<CountryGeometry, GeoJsonProperties>,
  palette: MapPalette,
): void {
  if (!map.getSource(UK_CONTEXT_SOURCE_ID)) {
    map.addSource(UK_CONTEXT_SOURCE_ID, { type: "geojson", data });
  }

  if (!map.getLayer(UK_CONTEXT_FILL_LAYER_ID)) {
    map.addLayer({
      id: UK_CONTEXT_FILL_LAYER_ID,
      type: "fill",
      source: UK_CONTEXT_SOURCE_ID,
      paint: {
        "fill-color": palette.contextFill,
        "fill-opacity": palette.contextOpacity,
      },
    });
  }

  if (!map.getLayer(UK_CONTEXT_OUTLINE_LAYER_ID)) {
    map.addLayer({
      id: UK_CONTEXT_OUTLINE_LAYER_ID,
      type: "line",
      source: UK_CONTEXT_SOURCE_ID,
      paint: { "line-color": palette.contextOutline, "line-width": 1.25 },
    });
  }
}

function applyMapPalette(
  map: MapLibreMap,
  metric: MapMetric,
  regionAId: string | undefined,
  regionBId: string | undefined,
  palette: MapPalette,
): void {
  if (map.getLayer(FILL_LAYER_ID)) {
    map.setPaintProperty(FILL_LAYER_ID, "fill-color", choroplethExpression(metric.scale, palette.regionFill));
  }
  for (const layerId of [SELECTION_HALO_LAYER_ID, SELECTION_LAYER_ID]) {
    if (map.getLayer(layerId)) map.setFilter(layerId, selectionFilter(regionAId, regionBId));
  }
  if (map.getLayer(SELECTION_LAYER_ID)) {
    map.setPaintProperty(SELECTION_LAYER_ID, "line-color", selectionColor(regionAId));
  }
  if (map.getLayer(OUTLINE_LAYER_ID)) {
    map.setPaintProperty(OUTLINE_LAYER_ID, "line-color", palette.regionOutline);
  }
  if (map.getLayer(WATER_BACKGROUND_LAYER_ID)) {
    map.setPaintProperty(WATER_BACKGROUND_LAYER_ID, "background-color", palette.water);
  }
  if (map.getLayer(UK_CONTEXT_FILL_LAYER_ID)) {
    map.setPaintProperty(UK_CONTEXT_FILL_LAYER_ID, "fill-color", palette.contextFill);
    map.setPaintProperty(UK_CONTEXT_FILL_LAYER_ID, "fill-opacity", palette.contextOpacity);
  }
  if (map.getLayer(UK_CONTEXT_OUTLINE_LAYER_ID)) {
    map.setPaintProperty(UK_CONTEXT_OUTLINE_LAYER_ID, "line-color", palette.contextOutline);
  }
}

function waitForStyle(map: MapLibreMap): Promise<void> {
  if (map.isStyleLoaded()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    map.once("style.load", () => resolve());
  });
}

export function NordicMap({ metric, regionAId, regionBId, onRegionClick }: NordicMapProps) {
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const isDarkModeRef = useRef(isDarkMode);
  const regionAIdRef = useRef(regionAId);
  const regionBIdRef = useRef(regionBId);
  const onRegionClickRef = useRef(onRegionClick);
  const metricRef = useRef(metric);
  const geometryRef = useRef<FeatureCollection<Nuts2Geometry, GeoJsonProperties> | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hoveredPropertiesRef = useRef<GeoJsonProperties>(null);

  metricRef.current = metric;

  regionAIdRef.current = regionAId;
  regionBIdRef.current = regionBId;
  isDarkModeRef.current = isDarkMode;
  onRegionClickRef.current = onRegionClick;

  useEffect(() => {
    const rootElement = document.documentElement;
    const synchroniseTheme = () => setIsDarkMode(rootElement.classList.contains("dark"));
    const themeObserver = new MutationObserver(synchroniseTheme);

    synchroniseTheme();
    themeObserver.observe(rootElement, { attributes: true, attributeFilter: ["class"] });

    return () => themeObserver.disconnect();
  }, []);

  useEffect(() => {
    const mapContainer = containerRef.current;
    if (!mapContainer || mapRef.current) {
      return;
    }

    const requestController = new AbortController();
    const map = new maplibregl.Map({
      container: mapContainer,
      style: createMapStyle(mapPalette(isDarkModeRef.current)),
      center: [12, 53],
      zoom: 3,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: "metric-popup" });
    popupRef.current = popup;

    const initialiseGeometry = () => {
      void (async () => {
        try {
          const [nutsResponse, ukContextResponse] = await Promise.all([
            fetch(EUROPE_NUTS_SOURCE_URL, { signal: requestController.signal }),
            fetch(UK_CONTEXT_SOURCE_URL, { signal: requestController.signal }),
          ]);
          if (!nutsResponse.ok) {
            throw new Error(`Unable to load European NUTS geometry (${nutsResponse.status}).`);
          }
          if (!ukContextResponse.ok) {
            throw new Error(`Unable to load United Kingdom context geometry (${ukContextResponse.status}).`);
          }

          const [nutsData, ukContextData]: unknown[] = await Promise.all([
            nutsResponse.json(),
            ukContextResponse.json(),
          ]);
          if (!isNuts2FeatureCollection(nutsData)) {
            throw new Error("European NUTS geometry is not a valid, non-empty NUTS 2 FeatureCollection.");
          }
          if (!isUkContextFeatureCollection(ukContextData)) {
            throw new Error("United Kingdom context geometry is not a valid, non-empty country FeatureCollection.");
          }

          await waitForStyle(map);

          if (requestController.signal.aborted) {
            return;
          }

          geometryRef.current = nutsData;
          addUkContextLayers(map, ukContextData, mapPalette(isDarkModeRef.current));
          addRegionLayers(
            map,
            joinMetricToGeometry(nutsData, metricRef.current.values),
            metricRef.current,
            regionAIdRef.current,
            regionBIdRef.current,
            mapPalette(isDarkModeRef.current),
          );
          applyMapPalette(
            map,
            metricRef.current,
            regionAIdRef.current,
            regionBIdRef.current,
            mapPalette(isDarkModeRef.current),
          );
          fitEuropeanBounds(map);
        } catch (error) {
          if (!requestController.signal.aborted) {
            console.error("Unable to initialise European NUTS map geometry.", error);
          }
        }
      })();
    };

    initialiseGeometry();

    const reportClickedRegion = (event: MapLayerMouseEvent) => {
      const regionId = event.features?.[0]?.properties?.[NUTS_ID_PROPERTY];
      if (typeof regionId === "string") {
        onRegionClickRef.current?.(regionId);
      }
    };

    map.on("click", FILL_LAYER_ID, reportClickedRegion);
    map.on("contextmenu", FILL_LAYER_ID, (event: MapLayerMouseEvent) => {
      const regionId = event.features?.[0]?.properties?.[NUTS_ID_PROPERTY];
      const isSelectedRegion =
        regionId === regionAIdRef.current || regionId === regionBIdRef.current;

      if (typeof regionId === "string" && isSelectedRegion) {
        event.originalEvent.preventDefault();
        reportClickedRegion(event);
      }
    });
    map.on("mouseenter", FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mousemove", FILL_LAYER_ID, (event: MapLayerMouseEvent) => {
      const properties = event.features?.[0]?.properties;
      if (typeof properties?.NUTS_ID !== "string") {
        hoveredPropertiesRef.current = null;
        popup.remove();
        return;
      }
      if (hoveredPropertiesRef.current?.NUTS_ID !== properties.NUTS_ID) {
        updateHoverPopup(popup, properties, metricRef.current);
      }
      hoveredPropertiesRef.current = properties;
      popup.setLngLat(event.lngLat).addTo(map);
    });
    map.on("mouseleave", FILL_LAYER_ID, () => {
      hoveredPropertiesRef.current = null;
      popup.remove();
      map.getCanvas().style.cursor = "";
    });

    return () => {
      requestController.abort();
      popup.remove();
      popupRef.current = null;
      hoveredPropertiesRef.current = null;
      geometryRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      applyMapPalette(map, metricRef.current, regionAId, regionBId, mapPalette(isDarkMode));
    }
  }, [isDarkMode, regionAId, regionBId, metric.scale]);

  useEffect(() => {
    const source = mapRef.current?.getSource<GeoJSONSource>(SOURCE_ID);
    if (source && geometryRef.current) {
      void source.setData(joinMetricToGeometry(geometryRef.current, metric.values)).catch((error: unknown) => {
        console.error("Unable to update regional metric data.", error);
      });
    }
  }, [metric.values]);

  useEffect(() => {
    if (popupRef.current && hoveredPropertiesRef.current) {
      updateHoverPopup(popupRef.current, hoveredPropertiesRef.current, metric);
    }
  }, [metric]);

  return (
    <div className="relative h-[360px] w-full sm:h-[420px] md:h-[480px] lg:h-auto lg:min-h-0 lg:flex-1">
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} aria-label="Interactive map of European NUTS 2 regions" />
      <MapLegend metric={metric} noDataColor={mapPalette(isDarkMode).regionFill} />
      <p aria-label="Geographic data attribution" className="absolute bottom-0 right-0 z-10 max-w-full rounded-tl bg-card px-2 py-1 text-[11px] leading-snug text-card-foreground">
        <a href="https://ec.europa.eu/eurostat/en/web/gisco/geodata/statistical-units" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Eurostat / GISCO</a>
        {" · © EuroGeographics for the administrative boundaries"}
      </p>
    </div>
  );
}
