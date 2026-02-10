"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlannerState } from "@/hooks/usePlannerState";

export default function MapPanel() {
  const { plan } = usePlannerState();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initMap = async () => {
      const mapboxgl = await import("mapbox-gl");
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
      mapInstance.current = new mapboxgl.default.Map({
        container: mapRef.current as HTMLElement,
        style: "mapbox://styles/mapbox/outdoors-v12",
        center: [-79.3832, 43.6532],
        zoom: 9
      });

      mapInstance.current.addControl(new mapboxgl.default.NavigationControl({ showCompass: false }), "top-right");
      mapInstance.current.on("load", () => {
        setMapReady(true);
      });
    };

    initMap();
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !plan || !mapReady) return;

    const map = mapInstance.current;
    const deliveriesById = new Map(plan.deliveries.map((d) => [d.id, d]));
    const depotLon = (plan.meta as any)?.depot_lon;
    const depotLat = (plan.meta as any)?.depot_lat;

    const lineFeatures: any[] = [];
    const pointFeatures: any[] = [];
    const palette = ["#2563eb", "#16a34a", "#f97316", "#9333ea", "#0f766e", "#dc2626"];

    plan.routes.forEach((route, routeIndex) => {
      const coords: number[][] = [];
      route.stops.forEach((group, idx) => {
        const delivery = group.find((s) => s.type === "delivery" && s.id);
        if (!delivery || !delivery.id) return;
        const d = deliveriesById.get(delivery.id);
        if (!d || d.lon == null || d.lat == null) return;
        coords.push([d.lon, d.lat]);
        pointFeatures.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [d.lon, d.lat] },
          properties: {
            label: delivery.job_name || d.job_name || `Route ${routeIndex + 1} Stop ${idx + 1}`,
            route: routeIndex + 1
          }
        });
      });
      if (depotLon != null && depotLat != null) {
        coords.unshift([depotLon, depotLat]);
        coords.push([depotLon, depotLat]);
        pointFeatures.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [depotLon, depotLat] },
          properties: { label: "Depot", route: routeIndex + 1 }
        });
      }
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
  }, [plan, mapReady]);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle>Route Map</CardTitle>
      </CardHeader>
      <div ref={mapRef} className="h-[360px] w-full rounded-lg" />
    </Card>
  );
}
