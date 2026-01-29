"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HeatmapSidebarProps {
  layers: {
    water: boolean;
    power: boolean;
    wifi: boolean;
  };
  timeRange: "24h" | "7d" | "30d";
  onLayerToggle: (layer: "water" | "power" | "wifi") => void;
  onTimeRangeChange: (range: "24h" | "7d" | "30d") => void;
  onClose: () => void;
}

export function HeatmapSidebar({
  layers,
  timeRange,
  onLayerToggle,
  onTimeRangeChange,
  onClose,
}: HeatmapSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -400 }}
          animate={{ x: 0 }}
          exit={{ x: -400 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed left-4 top-20 z-[1000] w-80 max-h-[calc(100vh-6rem)] bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] backdrop-blur-xl border-2 border-white/40 rounded-2xl shadow-2xl shadow-[#3F7F6B]/10 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/40 bg-white/20">
            <h2 className="text-lg font-semibold text-[#0F2A33]">
              City Heatmap Controls
            </h2>
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-[#3F7F6B]/20 transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg
                className="w-5 h-5 text-[#0F2A33]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="p-4 space-y-6 overflow-y-auto flex-1">
            {/* Layer Toggles */}
            <div>
              <h3 className="text-sm font-medium text-[#0F2A33] mb-3">
                Infrastructure Layers
              </h3>
              <div className="space-y-2">
                {[
                  { key: "water" as const, label: "Water Systems", icon: "💧" },
                  {
                    key: "power" as const,
                    label: "Power & Electrical",
                    icon: "⚡",
                  },
                  {
                    key: "wifi" as const,
                    label: "Wi-Fi & Network",
                    icon: "📶",
                  },
                ].map((layer) => (
                  <label
                    key={layer.key}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/30 hover:bg-[#3F7F6B]/20 cursor-pointer transition-all border border-white/40"
                  >
                    <input
                      type="checkbox"
                      checked={layers[layer.key]}
                      onChange={() => onLayerToggle(layer.key)}
                      className="w-4 h-4 rounded border-[#26658C] bg-white/50 text-[#3F7F6B] focus:ring-[#3F7F6B] focus:ring-offset-0"
                    />
                    <span className="text-2xl">{layer.icon}</span>
                    <span className="text-sm text-[#0F2A33] flex-1 font-medium">
                      {layer.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Time Range Slider */}
            <div>
              <h3 className="text-sm font-medium text-[#0F2A33] mb-3">
                Time Range
              </h3>
              <div className="space-y-2">
                {[
                  { value: "24h" as const, label: "Last 24 Hours" },
                  { value: "7d" as const, label: "Last 7 Days" },
                  { value: "30d" as const, label: "Last 30 Days" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onTimeRangeChange(option.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      timeRange === option.value
                        ? "bg-gradient-to-r from-[#3F7F6B] to-[#2F8F8A] text-white shadow-lg shadow-[#3F7F6B]/25"
                        : "bg-white/30 text-[#355E6B] hover:bg-[#3F7F6B]/10 border border-white/40"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Toggle Button (when closed) */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={toggleSidebar}
          className="fixed left-4 top-20 z-[1000] p-3 bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] backdrop-blur-xl border-2 border-white/40 rounded-xl shadow-lg shadow-[#3F7F6B]/10 hover:shadow-xl hover:shadow-[#3F7F6B]/20 transition-all"
          aria-label="Open sidebar"
        >
          <svg
            className="w-6 h-6 text-[#0F2A33]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
