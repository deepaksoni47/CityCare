"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HeatmapStatsData {
  totalPoints: number;
  totalIssues: number;
  avgWeight: number;
  maxWeight: number;
  minWeight: number;
  weightDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  geographicBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  categoryBreakdown: Record<string, number>;
  timeDecayStats: {
    avgAge: number;
    oldestIssue: string;
    newestIssue: string;
  };
}

interface HeatmapStatsProps {
  statsData?: HeatmapStatsData;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function HeatmapStats({
  statsData,
  isLoading,
  onRefresh,
}: HeatmapStatsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!statsData && !isLoading) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatAge = (hours: number) => {
    if (hours < 24) return `${Math.round(hours)}h`;
    if (hours < 24 * 7) return `${Math.round(hours / 24)}d`;
    return `${Math.round(hours / 24 / 7)}w`;
  };

  return (
    <>
      {/* Stats Toggle Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 md:bottom-6 right-4 md:right-auto md:left-6 z-[1000] px-3 md:px-4 py-2 md:py-3 bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] border border-white/40 rounded-lg md:rounded-xl shadow-lg shadow-[#3F7F6B]/10 hover:shadow-xl hover:shadow-[#3F7F6B]/15 transition-all flex items-center gap-2"
      >
        <svg
          className="w-4 h-4 md:w-5 md:h-5 text-[#26658C]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <span className="text-xs md:text-sm font-medium text-[#0F2A33]">
          Stats
        </span>
      </motion.button>

      {/* Stats Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 400, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-16 md:bottom-20 right-4 md:right-auto md:left-6 z-[1001] w-[calc(100vw-2rem)] md:w-[420px] max-h-[calc(100vh-140px)] md:max-h-[calc(100vh-180px)] bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] border border-white/40 rounded-xl md:rounded-2xl shadow-2xl shadow-[#3F7F6B]/10 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/40 flex-shrink-0">
              <h2 className="text-lg font-semibold text-[#0F2A33]">
                Heatmap Statistics
              </h2>
              <div className="flex gap-2">
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                    aria-label="Refresh statistics"
                  >
                    <svg
                      className={`w-4 h-4 text-[#26658C] ${isLoading ? "animate-spin" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  aria-label="Close statistics"
                >
                  <svg
                    className="w-4 h-4 text-[#26658C]"
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
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#548FB3]/20 border-t-[#548FB3] mb-2"></div>
                    <p className="text-sm text-[#355E6B]">
                      Loading statistics...
                    </p>
                  </div>
                </div>
              ) : statsData ? (
                <>
                  {/* Overview Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-[#548FB3]/20 to-[#26658C]/20 border border-[#26658C]/40 rounded-xl p-4 shadow-sm">
                      <div className="text-2xl font-bold text-[#0F2A33]">
                        {statsData.totalIssues}
                      </div>
                      <div className="text-xs text-[#355E6B] mt-1">
                        Total Issues
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-[#3F7F6B]/20 to-[#2F8F8A]/20 border border-[#3F7F6B]/40 rounded-xl p-4 shadow-sm">
                      <div className="text-2xl font-bold text-[#0F2A33]">
                        {statsData.totalPoints}
                      </div>
                      <div className="text-xs text-[#355E6B] mt-1">
                        Heatmap Points
                      </div>
                    </div>
                  </div>

                  {/* Weight Stats */}
                  <div className="bg-white/40 border border-white/60 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-[#0F2A33] mb-3">
                      Weight Analysis
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#355E6B]">Average</span>
                        <span className="text-sm font-medium text-[#0F2A33]">
                          {statsData.avgWeight.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#355E6B]">Maximum</span>
                        <span className="text-sm font-medium text-[#0F2A33]">
                          {statsData.maxWeight.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#355E6B]">Minimum</span>
                        <span className="text-sm font-medium text-[#0F2A33]">
                          {statsData.minWeight.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Priority Distribution */}
                  <div className="bg-white/40 border border-white/60 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-[#0F2A33] mb-3">
                      Priority Distribution
                    </h3>
                    <div className="space-y-2">
                      {[
                        {
                          key: "critical",
                          label: "Critical",
                          color: "bg-[#023859]",
                          count: statsData.weightDistribution.critical,
                        },
                        {
                          key: "high",
                          label: "High",
                          color: "bg-[#26658C]",
                          count: statsData.weightDistribution.high,
                        },
                        {
                          key: "medium",
                          label: "Medium",
                          color: "bg-[#3F7F6B]",
                          count: statsData.weightDistribution.medium,
                        },
                        {
                          key: "low",
                          label: "Low",
                          color: "bg-[#2F8F8A]",
                          count: statsData.weightDistribution.low,
                        },
                      ].map((priority) => (
                        <div
                          key={priority.key}
                          className="flex items-center gap-3"
                        >
                          <div
                            className={`w-3 h-3 rounded ${priority.color}`}
                          />
                          <div className="flex-1 flex justify-between items-center">
                            <span className="text-xs text-[#355E6B]">
                              {priority.label}
                            </span>
                            <span className="text-sm font-medium text-[#0F2A33]">
                              {priority.count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  {Object.keys(statsData.categoryBreakdown).length > 0 && (
                    <div className="bg-white/40 border border-white/60 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-[#0F2A33] mb-3">
                        Category Breakdown
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(statsData.categoryBreakdown)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 5)
                          .map(([category, count]) => (
                            <div
                              key={category}
                              className="flex justify-between items-center"
                            >
                              <span className="text-xs text-[#355E6B]">
                                {category}
                              </span>
                              <span className="text-sm font-medium text-[#0F2A33]">
                                {count}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Time Stats */}
                  <div className="bg-white/40 border border-white/60 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-[#0F2A33] mb-3">
                      Time Analysis
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#355E6B]">Avg Age</span>
                        <span className="text-sm font-medium text-[#0F2A33]">
                          {formatAge(statsData.timeDecayStats.avgAge)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#355E6B]">Oldest</span>
                        <span className="text-sm font-medium text-[#0F2A33]">
                          {formatDate(statsData.timeDecayStats.oldestIssue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#355E6B]">Newest</span>
                        <span className="text-sm font-medium text-[#0F2A33]">
                          {formatDate(statsData.timeDecayStats.newestIssue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Geographic Bounds */}
                  <div className="bg-white/40 border border-white/60 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-[#0F2A33] mb-3">
                      Geographic Bounds
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[#355E6B]">North: </span>
                        <span className="text-[#0F2A33] font-mono">
                          {statsData.geographicBounds.north.toFixed(6)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#355E6B]">South: </span>
                        <span className="text-[#0F2A33] font-mono">
                          {statsData.geographicBounds.south.toFixed(6)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#355E6B]">East: </span>
                        <span className="text-[#0F2A33] font-mono">
                          {statsData.geographicBounds.east.toFixed(6)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#355E6B]">West: </span>
                        <span className="text-[#0F2A33] font-mono">
                          {statsData.geographicBounds.west.toFixed(6)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-[#355E6B]">
                    No statistics available
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
