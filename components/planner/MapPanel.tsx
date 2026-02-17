"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlannerState } from "@/hooks/usePlannerState";

const FALLBACK_STYLE: any = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors"
    }
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }]
};

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function coerceMapboxToken(raw: string | undefined): string {
  const text = String(raw || "").trim();
  if (!text) return "";
  const match = text.match(/pk\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  return match ? match[0] : text;
}

export default function MapPanel() {
  const { plan } = usePlannerState();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const usingFallbackStyle = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initMap = async () => {
      try {
        const mapboxgl = await import("mapbox-gl");
        const token = coerceMapboxToken(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
        const hasToken = Boolean(token);
        mapboxgl.default.accessToken = token;
        mapInstance.current = new mapboxgl.default.Map({
          container: mapRef.current as HTMLElement,
          style: hasToken ? "mapbox://styles/mapbox/outdoors-v12" : FALLBACK_STYLE,
          center: [-79.3832, 43.6532],
          zoom: 9
        });
        usingFallbackStyle.current = !hasToken;
        if (!hasToken) {
          setMapError("Mapbox token is missing. Showing fallback map style.");
        }

        mapInstance.current.addControl(new mapboxgl.default.NavigationControl({ showCompass: false }), "top-right");
        mapInstance.current.on("load", () => {
          setMapReady(true);
        });
        mapInstance.current.on("styledata", () => {
          try {
            if (mapInstance.current?.isStyleLoaded?.()) {
              setMapReady(true);
            }
          } catch {
            // ignore style readiness race
          }
        });
        mapInstance.current.on("error", (event: any) => {
          const message = String(event?.error?.message || "").toLowerCase();
          const authIssue =
            message.includes("401") ||
            message.includes("403") ||
            message.includes("unauthorized") ||
            message.includes("access token");
          if (authIssue && !usingFallbackStyle.current) {
            try {
              usingFallbackStyle.current = true;
              mapInstance.current.setStyle(FALLBACK_STYLE);
              setMapError("Mapbox access failed. Showing fallback map style.");
            } catch {
              setMapError("Unable to load map style.");
            }
          }
        });
      } catch (error) {
        setMapError("Unable to initialize map.");
      }
    };

    initMap();
    return () => {
      try {
        mapInstance.current?.remove?.();
      } catch {
        // ignore map teardown errors
      } finally {
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !plan || !mapReady) return;

    const map = mapInstance.current;
    const deliveriesById = new Map<string, any>();
    (plan.deliveries || []).forEach((d: any) => {
      const id = String(d?.id || "").trim();
      const deliveryId = String(d?.delivery_id || "").trim();
      if (id) deliveriesById.set(id, d);
      if (deliveryId) deliveriesById.set(deliveryId, d);
    });
    const depotLon = toNumber((plan.meta as any)?.depot_lon);
    const depotLat = toNumber((plan.meta as any)?.depot_lat);

    const lineFeatures: any[] = [];
    const pointFeatures: any[] = [];
    const palette = ["#2563eb", "#16a34a", "#f97316", "#9333ea", "#0f766e", "#dc2626"];
    const boundsCoords: [number, number][] = [];

    plan.routes.forEach((route, routeIndex) => {
      const coords: number[][] = [];
      route.stops.forEach((group, idx) => {
        const stopGroup = Array.isArray(group) ? group : [group];
        const depotStop = stopGroup.find((s) => s?.type === "depot");
        if (depotStop) {
          if (depotLon == null || depotLat == null) return;
          coords.push([depotLon, depotLat]);
          boundsCoords.push([depotLon, depotLat]);
          pointFeatures.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [depotLon, depotLat] },
            properties: {
              label: depotStop.label || "Depot",
              route: routeIndex + 1
            }
          });
          return;
        }

        const deliveries = stopGroup.filter((s) => s?.type === "delivery");
        if (!deliveries.length) return;

        let firstCoordAdded = false;
        deliveries.forEach((delivery: any) => {
          const deliveryKey = String(delivery?.id || delivery?.delivery_id || "").trim();
          if (!deliveryKey) return;
          const d = deliveriesById.get(deliveryKey);
          const lon = toNumber(d?.lon);
          const lat = toNumber(d?.lat);
          if (lon == null || lat == null) return;
          if (!firstCoordAdded) {
            coords.push([lon, lat]);
            boundsCoords.push([lon, lat]);
            firstCoordAdded = true;
          }
          pointFeatures.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [lon, lat] },
            properties: {
              label: delivery?.job_name || d?.job_name || `Route ${routeIndex + 1} Stop ${idx + 1}`,
              route: routeIndex + 1
            }
          });
        });
      });

      if (coords.length >= 2) {
        lineFeatures.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
          properties: { route: routeIndex + 1, color: palette[routeIndex % palette.length] }
        });
      }
    });

    const lineSource = map.getSource("plan-routes");
    if (!lineSource) {
      map.addSource("plan-routes", {
        type: "geojson",
        data: { type: "FeatureCollection", features: lineFeatures }
      });
      map.addLayer({
        id: "plan-routes-line",
        type: "line",
        source: "plan-routes",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 3,
          "line-opacity": 0.7
        }
      });
    } else {
      (lineSource as any).setData({ type: "FeatureCollection", features: lineFeatures });
    }

    const pointSource = map.getSource("plan-stops");
    if (!pointSource) {
      map.addSource("plan-stops", {
        type: "geojson",
        data: { type: "FeatureCollection", features: pointFeatures }
      });
      map.addLayer({
        id: "plan-stops-circle",
        type: "circle",
        source: "plan-stops",
        paint: {
          "circle-radius": 5,
          "circle-color": "#0f172a",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2
        }
      });
      map.addLayer({
        id: "plan-stops-labels",
        type: "symbol",
        source: "plan-stops",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 11,
          "text-offset": [0, 1.2]
        },
        paint: { "text-color": "#0f172a" }
      });
    } else {
      (pointSource as any).setData({ type: "FeatureCollection", features: pointFeatures });
    }

    if (boundsCoords.length > 0) {
      let minLon = boundsCoords[0][0];
      let minLat = boundsCoords[0][1];
      let maxLon = boundsCoords[0][0];
      let maxLat = boundsCoords[0][1];
      boundsCoords.forEach(([lon, lat]) => {
        minLon = Math.min(minLon, lon);
        minLat = Math.min(minLat, lat);
        maxLon = Math.max(maxLon, lon);
        maxLat = Math.max(maxLat, lat);
      });
      try {
        map.fitBounds(
          [
            [minLon, minLat],
            [maxLon, maxLat]
          ],
          { padding: 36, duration: 400, maxZoom: 14 }
        );
      } catch {
        // ignore fit bounds errors for malformed coordinates
      }
    }
  }, [plan, mapReady]);

  useEffect(() => {
    if (!mapInstance.current || !mapReady) return;
    const handleResize = () => {
      try {
        mapInstance.current.resize();
      } catch {
        // ignore map resize errors during teardown
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mapReady, plan]);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Route Map</CardTitle>
      </CardHeader>
      <div className="px-5 pb-5">
        <div ref={mapRef} className="w-full aspect-[16/10] rounded-lg border border-steel-100" />
        {mapError ? <div className="mt-2 text-xs text-rose-700">{mapError}</div> : null}
      </div>
    </Card>
  );
}
