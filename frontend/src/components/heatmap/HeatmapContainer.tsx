"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@/styles/heatmap.css";
import { HeatmapLayer } from "./HeatmapLayer";
import { HeatmapLegend } from "./HeatmapLegend";

// Custom marker icons for different categories
const createCustomIcon = (category?: string[]) => {
  let color = "#548FB3"; // Default City Blue
  let icon = "⚡";

  if (category && category.length > 0) {
    const cat = category[0].toLowerCase();
    if (cat.includes("water") || cat.includes("plumb")) {
      color = "#7CBFD0"; // City Blue Soft
      icon = "💧";
    } else if (cat.includes("power") || cat.includes("electric")) {
      color = "#26658C"; // City Blue Strong
      icon = "⚡";
    } else if (cat.includes("wifi") || cat.includes("network")) {
      color = "#3F7F6B"; // Care Green Primary
      icon = "📡";
    } else if (cat.includes("hvac") || cat.includes("ac")) {
      color = "#023859"; // City Blue Deep
      icon = "❄️";
    } else if (cat.includes("maintenance")) {
      color = "#2F8F8A"; // Blue-Green Teal
      icon = "🔧";
    }
  }

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          background: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          border: 3px solid white;
        "></div>
        <div style="
          position: relative;
          font-size: 18px;
          transform: rotate(0deg);
          z-index: 10;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
        ">${icon}</div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

// Fix for default marker icons in Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  issueCount?: number;
  avgSeverity?: number;
  categories?: string[];
  issueIds?: string[];
}

interface HeatmapContainerProps {
  initialData?: HeatmapPoint[];
  center?: [number, number];
  zoom?: number;
  bounds?: [[number, number], [number, number]];
  onGenerateAIInsight?: () => Promise<void>;
  onFiltersChange?: (filters: {
    categories: string[];
    timeRange: "24h" | "7d" | "30d";
  }) => void;
}

// Component to handle zoom level changes
function ZoomHandler({
  onZoomChange,
}: {
  onZoomChange: (zoom: number) => void;
}) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });
  return null;
}

function RecenterHandler({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
  }, [center, map]);

  return null;
}

export function HeatmapContainer({
  initialData = [],
  center = [28.5494, 77.1917], // Default: Delhi, India
  zoom = 15,
  bounds,
  onGenerateAIInsight,
  onFiltersChange,
}: HeatmapContainerProps) {
  const router = useRouter();
  const [layers, setLayers] = useState({
    infrastructure: false,
    environment: false,
    safety: false,
  });
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [showMarkers, setShowMarkers] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>(initialData);

  // Map UI layer names to backend category names (matching current standardized categories)
  const layerCategoryMap: Record<string, string[]> = {
    infrastructure: [
      "Roads",
      "Water",
      "Electricity",
      "Sanitation",
      "Streetlights",
      "Transportation",
    ],
    environment: ["Parks", "Pollution"],
    safety: ["Safety", "Public_Health"],
  };

  // Show individual markers when zoomed in past level 16
  useEffect(() => {
    setShowMarkers(currentZoom >= 16);
  }, [currentZoom]);

  // Update data when initialData changes
  useEffect(() => {
    setHeatmapData(initialData);
  }, [initialData]);

  // Filter heatmap data based on active layers
  const filteredData = useMemo(() => {
    if (!heatmapData.length) return [];

    console.log("🔍 HeatmapContainer filtering:", {
      totalPoints: heatmapData.length,
      layersActive: layers,
      noLayersActive:
        !layers.infrastructure && !layers.environment && !layers.safety,
    });

    // If no layers are active, show all data
    if (!layers.infrastructure && !layers.environment && !layers.safety) {
      console.log(
        "✅ No layers active - showing all",
        heatmapData.length,
        "points",
      );
      return heatmapData;
    }

    // Filter by active layers (categories)
    const filtered = heatmapData.filter((point) => {
      if (!point.categories || point.categories.length === 0) {
        return true; // Include points without categories
      }

      // Check if point's categories match any active layer
      const activeCategories: string[] = [];
      if (layers.infrastructure)
        activeCategories.push(...layerCategoryMap.infrastructure);
      if (layers.environment)
        activeCategories.push(...layerCategoryMap.environment);
      if (layers.safety) activeCategories.push(...layerCategoryMap.safety);

      return point.categories.some((cat) =>
        activeCategories.some(
          (activeCat) => cat.toLowerCase() === activeCat.toLowerCase(),
        ),
      );
    });

    console.log("✅ Filtered to", filtered.length, "points");
    return filtered;
  }, [heatmapData, layers]);

  // Convert to heatmap format
  const heatmapPoints = useMemo(
    () =>
      filteredData.map((point) => ({
        lat: point.lat,
        lng: point.lng,
        intensity: point.intensity,
      })),
    [filteredData],
  );

  const handleLayerToggle = (
    layer: "infrastructure" | "environment" | "safety",
  ) => {
    setLayers((prev) => {
      const newLayers = { ...prev, [layer]: !prev[layer] };

      // Notify parent component of filter changes
      if (onFiltersChange) {
        const activeCategories: string[] = [];
        if (newLayers.infrastructure)
          activeCategories.push(...layerCategoryMap.infrastructure);
        if (newLayers.environment)
          activeCategories.push(...layerCategoryMap.environment);
        if (newLayers.safety) activeCategories.push(...layerCategoryMap.safety);

        onFiltersChange({
          categories: activeCategories,
          timeRange,
        });
      }

      return newLayers;
    });
  };

  const handleTimeRangeChange = (range: "24h" | "7d" | "30d") => {
    setTimeRange(range);

    // Notify parent component of filter changes
    if (onFiltersChange) {
      const activeCategories: string[] = [];
      if (layers.infrastructure) activeCategories.push(...layerCategoryMap.infrastructure);
      if (layers.environment) activeCategories.push(...layerCategoryMap.environment);
      if (layers.safety) activeCategories.push(...layerCategoryMap.safety);

      onFiltersChange({
        categories: activeCategories,
        timeRange: range,
      });
    }
  };

  const handleAIInsight = async () => {
    if (!onGenerateAIInsight) return;
    setIsLoading(true);
    try {
      await onGenerateAIInsight();
    } catch (error) {
      console.error("AI Insight error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full">
      <MapContainer
        key={`heatmap-map-${center[0]}-${center[1]}`}
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
        scrollWheelZoom={true}
        minZoom={5}
        maxZoom={19}
        maxBounds={bounds}
        maxBoundsViscosity={bounds ? 0.9 : undefined}
      >
        <RecenterHandler center={center} />

        {/* Light theme tile layer (CartoDB Positron) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {/* Heatmap Layer */}
        {heatmapPoints.length > 0 && (
          <HeatmapLayer
            points={heatmapPoints}
            radius={40}
            blur={25}
            maxZoom={17}
            max={1.5}
            minOpacity={0.2}
          />
        )}

        {/* Individual Markers (when zoomed in) */}
        {showMarkers &&
          filteredData.map((point, index) => {
            const severityColor = point.avgSeverity
              ? point.avgSeverity >= 8
                ? "#023859" // City Blue Dark - Critical
                : point.avgSeverity >= 6
                  ? "#26658C" // City Blue Strong - High
                  : point.avgSeverity >= 4
                    ? "#548FB3" // City Blue Primary - Medium
                    : "#3F7F6B" // Care Green Primary - Low/Healthy
              : "#7A9DA8"; // Civic Muted - Unknown

            const categoryIcon =
              point.categories && point.categories.length > 0
                ? point.categories[0].toLowerCase().includes("water")
                  ? "💧"
                  : point.categories[0].toLowerCase().includes("power") ||
                      point.categories[0].toLowerCase().includes("electric")
                    ? "⚡"
                    : point.categories[0].toLowerCase().includes("wifi") ||
                        point.categories[0].toLowerCase().includes("network")
                      ? "📡"
                      : point.categories[0].toLowerCase().includes("hvac") ||
                          point.categories[0].toLowerCase().includes("ac")
                        ? "❄️"
                        : "🔧"
                : "📍";

            return (
              <Marker
                key={index}
                position={[point.lat, point.lng]}
                icon={createCustomIcon(point.categories)}
              >
                <Popup maxWidth={320} className="custom-popup">
                  <div
                    className="min-w-[280px] rounded-lg overflow-hidden"
                    style={{
                      background:
                        "linear-gradient(135deg, #3F7F6B 0%, #26658C 100%)",
                    }}
                  >
                    {/* Header */}
                    <div className="px-4 py-3 text-white">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{categoryIcon}</span>
                        <h3 className="font-bold text-lg">
                          Infrastructure Issue
                        </h3>
                      </div>
                      {point.categories && point.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {point.categories.map((cat, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 text-xs font-semibold rounded-full"
                              style={{
                                background: "rgba(255,255,255,0.2)",
                                backdropFilter: "blur(10px)",
                              }}
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="px-4 py-3 bg-gradient-to-br from-[#DDF3E6] to-[#CFEAF0]">
                      {point.issueCount && (
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#A3C6BE]/40">
                          <span className="text-sm font-medium text-[#355E6B]">
                            Total Issues
                          </span>
                          <span className="text-lg font-bold text-[#0F2A33]">
                            {point.issueCount}
                          </span>
                        </div>
                      )}

                      {point.avgSeverity && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-[#355E6B]">
                              Severity Level
                            </span>
                            <span
                              className="text-sm font-bold"
                              style={{ color: severityColor }}
                            >
                              {point.avgSeverity.toFixed(1)}/10
                            </span>
                          </div>
                          <div
                            className="w-full rounded-full h-2 overflow-hidden"
                            style={{ background: "rgba(163,198,190,0.3)" }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${(point.avgSeverity / 10) * 100}%`,
                                background: `linear-gradient(90deg, ${severityColor} 0%, ${severityColor}dd 100%)`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-[#7A9DA8] mt-3 pt-2 border-t border-[#A3C6BE]/40">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        <span>
                          Intensity: {(point.intensity * 100).toFixed(0)}%
                        </span>
                      </div>

                      {/* Action Buttons */}
                      {point.issueIds && point.issueIds.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-[#A3C6BE]/40">
                          {point.issueIds.length === 1 ? (
                            // Single issue - show view button
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/issues/${point.issueIds![0]}`);
                              }}
                              className="w-full px-3 py-2 bg-gradient-to-r from-[#3F7F6B] to-[#2F8F8A] text-white text-sm font-medium rounded-lg hover:from-[#2F8F8A] hover:to-[#235347] transition-all"
                            >
                              View Issue
                            </button>
                          ) : (
                            // Multiple issues - show single view button
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const issueIdsParam = point.issueIds!.join(",");
                                router.push(
                                  `/issues?issueIds=${issueIdsParam}`,
                                );
                              }}
                              className="w-full px-3 py-2 bg-gradient-to-r from-[#3F7F6B] to-[#2F8F8A] text-white text-sm font-medium rounded-lg hover:from-[#2F8F8A] hover:to-[#235347] transition-all"
                            >
                              View {point.issueIds.length} Issues
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Zoom handler */}
        <ZoomHandler onZoomChange={setCurrentZoom} />
      </MapContainer>

      {/* Legend */}
      <HeatmapLegend />

      {/* AI Insight Button */}
      {onGenerateAIInsight && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAIInsight}
          disabled={isLoading}
          className="fixed top-24 right-6 z-[1000] px-6 py-3 bg-gradient-to-r from-[#3F7F6B] via-[#2F8F8A] to-[#26658C] border-2 border-white/30 text-white font-medium rounded-xl shadow-lg shadow-[#3F7F6B]/25 hover:shadow-xl hover:shadow-[#26658C]/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <span>Generate AI Insight</span>
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
