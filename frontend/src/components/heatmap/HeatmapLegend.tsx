"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export function HeatmapLegend() {
  const [isExpanded, setIsExpanded] = useState(false);

  const gradientStops = [
    { color: "blue", label: "Low", intensity: "0-20%" },
    { color: "cyan", label: "Moderate", intensity: "20-40%" },
    { color: "lime", label: "Medium", intensity: "40-60%" },
    { color: "yellow", label: "High", intensity: "60-80%" },
    { color: "orange", label: "Very High", intensity: "80-90%" },
    { color: "red", label: "Critical", intensity: "90-100%" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[1000] bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] border border-white/40 rounded-xl md:rounded-2xl shadow-2xl shadow-[#3F7F6B]/10 w-auto md:w-64"
    >
      {/* Mobile: Compact Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="md:hidden w-full flex items-center justify-between p-3 text-[#0F2A33]"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-[#548FB3] via-[#3F7F6B] to-[#2F8F8A]" />
          <span className="text-sm font-semibold">Heat Intensity</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Desktop: Always Visible / Mobile: Collapsible */}
      <div className={`${isExpanded ? "block" : "hidden"} md:block p-4`}>
        <h3 className="text-sm font-semibold text-[#0F2A33] mb-3 hidden md:block">
          Heat Intensity
        </h3>
        <div className="space-y-2">
          {gradientStops.map((stop, index) => (
            <div key={index} className="flex items-center gap-2 md:gap-3">
              <div
                className="w-6 h-6 md:w-8 md:h-8 rounded-lg border border-white/40 flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${stop.color}, ${stop.color})`,
                }}
              />
              <div className="flex-1">
                <div className="text-xs font-medium text-[#0F2A33]">
                  {stop.label}
                </div>
                <div className="text-xs text-[#355E6B]">{stop.intensity}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-white/40">
          <p className="text-xs text-[#355E6B] leading-relaxed">
            Intensity is calculated from issue severity, priority, and recency.
            Red zones indicate critical city infrastructure issues requiring
            immediate attention.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
