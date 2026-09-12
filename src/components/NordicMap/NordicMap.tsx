import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { Feature, FeatureCollection, GeoJsonProperties, MultiPolygon, Polygon, Position } from "geojson";
import type { Map as MapLibreMap, MapLayerMouseEvent, StyleSpecification } from "maplibre-gl";
import { REGION_A_COLOR, REGION_B_COLOR } from "@/lib/region-colors";

const SOURCE_ID = "nuts-regions";
const FILL_LAYER_ID = "nuts-regions-fill";
const OUTLINE_LAYER_ID = "nuts-regions-outline";
const NUTS_ID_PROPERTY = "NUTS_ID";
const PRIMARY_VIEW_EXCLUDED_NUTS_IDS = new Set(["NO0B"]);
const NORDIC_NUTS_SOURCE_URL = `${import.meta.env.BASE_URL}data/nordic-nuts-2.geojson`;
type NordicNutsGeometry = Polygon | MultiPolygon;

maplibregl.setWorkerUrl(maplibreWorkerUrl);

const mapStyle: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "water-background",
      type: "background",
      paint: { "background-color": "#e7f3f7" },
    },
  ],
};

export interface NordicMapProps {
  regionAId?: string;
  regionBId?: string;
  onRegionClick?: (regionId: string) => void;
}

function isPosition(value: unknown): value is Position {
  return Array.isArray(value) && typeof value[0] === "number" && typeof value[1] === "number";
}

function extendBounds(bounds: maplibregl.LngLatBounds, coordinates: unknown): void {
  if (isPosition(coordinates)) {
    bounds.extend([coordinates[0], coordinates[1]]);
    return;
  }

  if (Array.isArray(coordinates)) {
    coordinates.forEach((coordinate) => extendBounds(bounds, coordinate));
  }
}

function isNordicNutsFeature(feature: Feature): feature is Feature<NordicNutsGeometry, GeoJsonProperties> {
  const nutsId = feature.properties?.[NUTS_ID_PROPERTY];
  const countryCode = feature.properties?.CNTR_CODE;

  return (
    typeof nutsId === "string" &&
    typeof countryCode === "string" &&
    ["DK", "FI", "IS", "NO", "SE"].includes(countryCode) &&
    (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")
  );
}

function isNordicNutsFeatureCollection(value: unknown): value is FeatureCollection<NordicNutsGeometry, GeoJsonProperties> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const collection = value as { type?: unknown; features?: unknown };
  return (
    collection.type === "FeatureCollection" &&
    Array.isArray(collection.features) &&
    collection.features.length > 0 &&
    collection.features.every((feature) => isNordicNutsFeature(feature as Feature))
  );
}

function fillColorExpression(regionAId: string | undefined, regionBId: string | undefined): maplibregl.ExpressionSpecification {
  return [
    "case",
    ["==", ["get", NUTS_ID_PROPERTY], regionAId ?? ""],
    REGION_A_COLOR,
    ["==", ["get", NUTS_ID_PROPERTY], regionBId ?? ""],
    REGION_B_COLOR,
    "#f8fafc",
  ];
}

function fillOpacityExpression(regionAId: string | undefined, regionBId: string | undefined): maplibregl.ExpressionSpecification {
  return [
    "case",
    [
      "any",
      ["==", ["get", NUTS_ID_PROPERTY], regionAId ?? ""],
      ["==", ["get", NUTS_ID_PROPERTY], regionBId ?? ""],
    ],
    0.68,
    0.9,
  ];
}

function fitPrimaryNordicBounds(map: MapLibreMap, data: FeatureCollection<NordicNutsGeometry, GeoJsonProperties>): void {
  const bounds = new maplibregl.LngLatBounds();
  const primaryFeatures = data.features.filter(
    (feature) => !PRIMARY_VIEW_EXCLUDED_NUTS_IDS.has(feature.properties?.[NUTS_ID_PROPERTY] as string),
  );

  primaryFeatures.forEach((feature) => extendBounds(bounds, feature.geometry.coordinates));

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, {
      padding: { top: 46, right: 36, bottom: 46, left: 36 },
      maxZoom: 4.2,
      duration: 0,
    });
  }
}

function addRegionLayers(
  map: MapLibreMap,
  data: FeatureCollection<NordicNutsGeometry, GeoJsonProperties>,
  regionAId: string | undefined,
  regionBId: string | undefined,
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
        "fill-color": fillColorExpression(regionAId, regionBId),
        "fill-opacity": fillOpacityExpression(regionAId, regionBId),
      },
    });
  }

  if (!map.getLayer(OUTLINE_LAYER_ID)) {
    map.addLayer({
      id: OUTLINE_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      paint: { "line-color": "#64748b", "line-width": 1.25 },
    });
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

export function NordicMap({ regionAId, regionBId, onRegionClick }: NordicMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const regionAIdRef = useRef(regionAId);
  const regionBIdRef = useRef(regionBId);
  const onRegionClickRef = useRef(onRegionClick);

  regionAIdRef.current = regionAId;
  regionBIdRef.current = regionBId;
  onRegionClickRef.current = onRegionClick;

  useEffect(() => {
    const mapContainer = containerRef.current;
    if (!mapContainer || mapRef.current) {
      return;
    }

    const requestController = new AbortController();
    const map = new maplibregl.Map({
      container: mapContainer,
      style: mapStyle,
      center: [8, 63.5],
      zoom: 2.7,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    const initialiseGeometry = () => {
      void (async () => {
        try {
          const response = await fetch(NORDIC_NUTS_SOURCE_URL, { signal: requestController.signal });
          if (!response.ok) {
            throw new Error(`Unable to load Nordic NUTS geometry (${response.status}).`);
          }

          const data: unknown = await response.json();
          if (!isNordicNutsFeatureCollection(data)) {
            throw new Error("Nordic NUTS geometry is not a valid, non-empty NUTS 2 FeatureCollection.");
          }

          await waitForStyle(map);

          if (requestController.signal.aborted) {
            return;
          }

          addRegionLayers(map, data, regionAIdRef.current, regionBIdRef.current);
          fitPrimaryNordicBounds(map, data);
        } catch (error) {
          if (!requestController.signal.aborted) {
            console.error("Unable to initialise Nordic NUTS map geometry.", error);
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
    map.on("mouseleave", FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    return () => {
      requestController.abort();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer(FILL_LAYER_ID)) {
      map.setPaintProperty(FILL_LAYER_ID, "fill-color", fillColorExpression(regionAId, regionBId));
      map.setPaintProperty(FILL_LAYER_ID, "fill-opacity", fillOpacityExpression(regionAId, regionBId));
    }
  }, [regionAId, regionBId]);

  return <div ref={containerRef} className="h-[360px] w-full sm:h-[420px] md:h-[480px] lg:h-auto lg:min-h-0 lg:flex-1" aria-label="Interactive map of Nordic NUTS 2 regions" />;
}
