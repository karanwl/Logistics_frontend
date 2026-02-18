"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlannerState } from "@/hooks/usePlannerState";
import { readErrorMessage } from "@/lib/errors/client";

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
  const routeCount = plan?.routes?.length || 0;
  const stopCount = (plan?.routes || []).reduce((sum: number, route: any) => sum + (route?.stops?.length || 0), 0);
  const hasReloadRun = (plan?.routes || []).some((route: any) =>
    (route?.stops || []).some((group: any) => {
      const stopGroup = Array.isArray(group) ? group : [group];
      const depotStop = stopGroup.find((item: any) => item?.type === "depot");
      if (!depotStop) return false;
      return String(depotStop?.label || "").toLowerCase().includes("reload");
    })
  );

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
          setMapError("Map service key is missing. Showing a basic map view.");
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
            // error-normalization-ignore: style readiness races are expected during map re-styling.
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
              setMapError("Map service access failed. Showing a basic map view.");
            } catch {
              // error-normalization-ignore: fallback style set can fail during map teardown.
              setMapError("Unable to load map view.");
            }
          }
        });
      } catch (error) {
        setMapError(readErrorMessage(error, "Unable to start the map."));
      }
    };

    initMap();
    return () => {
      try {
        mapInstance.current?.remove?.();
      } catch {
        // error-normalization-ignore: map teardown errors are non-actionable during unmount.
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
    const reloadRunPalette = ["#06b6d4", "#e11d48", "#22c55e", "#f59e0b", "#8b5cf6", "#14b8a6"];
    const boundsCoords: [number, number][] = [];

    plan.routes.forEach((route, routeIndex) => {
      let runIndex = 0;
      let runCoords: number[][] = [];
      const colorForRun = (index: number) => {
        if (index <= 0) return palette[routeIndex % palette.length];
        return reloadRunPalette[(routeIndex + index - 1) % reloadRunPalette.length];
      };
      const flushRun = () => {
        if (runCoords.length < 2) return;
        lineFeatures.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: runCoords },
          properties: {
            route: routeIndex + 1,
            run: runIndex + 1,
            color: colorForRun(runIndex)
          }
        });
      };

      route.stops.forEach((group, idx) => {
        const stopGroup = Array.isArray(group) ? group : [group];
        const depotStop = stopGroup.find((s) => s?.type === "depot");
        if (depotStop) {
          if (depotLon == null || depotLat == null) return;
          runCoords.push([depotLon, depotLat]);
          boundsCoords.push([depotLon, depotLat]);
          pointFeatures.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [depotLon, depotLat] },
            properties: {
              label: depotStop.label || "Depot",
              route: routeIndex + 1
            }
          });
          const depotLabel = String(depotStop.label || "").toLowerCase();
          if (depotLabel.includes("reload")) {
            flushRun();
            runIndex += 1;
            runCoords = [[depotLon, depotLat]];
          }
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
            runCoords.push([lon, lat]);
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

      flushRun();
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
          "line-width": 4,
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
        // error-normalization-ignore: invalid bounds should not break planner rendering.
      }
    }
  }, [plan, mapReady]);

  useEffect(() => {
    if (!mapInstance.current || !mapReady) return;
    const handleResize = () => {
      try {
        mapInstance.current.resize();
      } catch {
        // error-normalization-ignore: resize during teardown can throw and is safe to ignore.
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mapReady, plan]);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Route Map</CardTitle>
            <div className="card-subtitle">Map view of each vehicle trip, including depot restock runs.</div>
          </div>
          <div className="flex items-center gap-2 text-xs text-steel-600">
            <span className="rounded-full border border-steel-200 bg-white px-2 py-1">{routeCount} routes</span>
            <span className="rounded-full border border-steel-200 bg-white px-2 py-1">{stopCount} stops</span>
          </div>
        </div>
      </CardHeader>
      <div className="px-5 pb-5">
        <div ref={mapRef} className="w-full aspect-[16/10] rounded-lg border border-steel-100" />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-steel-600">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-5 rounded-full bg-[#2563eb]" />
            <span>Vehicle trip</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-5 rounded-full bg-[#06b6d4]" />
            <span>After restock</span>
          </div>
          {hasReloadRun ? (
            <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-sky-700">
              Depot restock included
            </span>
          ) : (
            <span className="rounded-full border border-steel-200 bg-white px-2 py-0.5 text-steel-600">
              No reloads
            </span>
          )}
        </div>
        {mapError ? <div className="mt-2 text-xs text-rose-700">{mapError}</div> : null}
      </div>
    </Card>
  );
}
