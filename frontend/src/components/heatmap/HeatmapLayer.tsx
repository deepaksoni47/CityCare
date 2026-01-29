"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
// @ts-ignore - leaflet.heat doesn't have official types
import "leaflet.heat";

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number; // 0-1 normalized weight
}

interface HeatmapLayerProps {
  points: HeatmapPoint[];
  radius?: number;
  blur?: number;
  maxZoom?: number;
  max?: number;
  minOpacity?: number;
  gradient?: Record<number, string>;
}

export function HeatmapLayer({
  points,
  radius = 40,
  blur = 25,
  maxZoom = 17,
  minOpacity = 0.2,
  max = 1.5,
  gradient = {
    0.0: "#0000FF", // Blue - Low (0-20%)
    0.2: "#00FFFF", // Cyan - Moderate (20-40%)
    0.4: "#00FF00", // Green - Medium (40-60%)
    0.6: "#FFFF00", // Yellow - High (60-80%)
    0.8: "#FFA500", // Orange - Very High (80-90%)
    1.0: "#FF0000", // Red - Critical (90-100%)
  },
}: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    // Convert points to leaflet.heat format: [lat, lng, intensity]
    // Amplify intensity values for better visualization
    const heatData = points.map((point) => [
      point.lat,
      point.lng,
      Math.pow(point.intensity, 0.7) * 1.5, // Power curve + amplification for better contrast
    ]) as [number, number, number][];

    // Create heat layer
    const heatLayer = (L as any).heatLayer(heatData, {
      radius,
      blur,
      maxZoom,
      max,
      minOpacity,
      gradient,
    });

    // Add to map
    heatLayer.addTo(map);

    // Cleanup on unmount or when points change
    return () => {
      if (map.hasLayer(heatLayer)) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, points, radius, blur, maxZoom, max, minOpacity, gradient]);

  return null; // This component doesn't render anything
}
