"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface Issue {
  id: number;
  x: number;
  y: number;
  type: "critical" | "warning" | "info";
  label: string;
}

const mockIssues: Issue[] = [
  { id: 1, x: 20, y: 30, type: "critical", label: "Power Outage" },
  { id: 2, x: 60, y: 45, type: "warning", label: "HVAC Fault" },
  { id: 3, x: 40, y: 65, type: "critical", label: "Water Leakage" },
  { id: 4, x: 75, y: 25, type: "info", label: "Network Issue" },
  { id: 5, x: 35, y: 80, type: "warning", label: "Elevator Issue" },
];

export function InteractiveCampusMap() {
  const [hoveredIssue, setHoveredIssue] = useState<number | null>(null);

  const getIssueColor = (type: Issue["type"]) => {
    switch (type) {
      case "critical":
        return "from-[#EF4444] to-[#B91C1C]"; // Hot Red - urgent/critical
      case "warning":
        return "from-[#F97316] to-[#EA580C]"; // Hot Orange - warning
      case "info":
        return "from-[#548FB3] to-[#26658C]"; // City Blue
    }
  };

  return (
    <div className="relative w-full aspect-square max-w-[550px] mx-auto">
      {/* Main Map Container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative w-full h-full rounded-3xl overflow-hidden border border-[#A3C6BE]/40 bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] backdrop-blur-xl"
        style={{
          boxShadow: "0 8px 32px -4px rgba(111, 163, 154, 0.25), 0 4px 16px -2px rgba(84, 143, 179, 0.15), inset 0 1px 0 rgba(255,255,255,0.5)"
        }}
      >
        {/* Grid Overlay */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(84,143,179,0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(84,143,179,0.15) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Animated Heatmap Base */}
        <svg className="absolute inset-0 w-full h-full opacity-30">
          <defs>
            <radialGradient id="heat1" cx="30%" cy="40%">
              <stop offset="0%" stopColor="#3F7F6B" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3F7F6B" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="heat2" cx="60%" cy="50%">
              <stop offset="0%" stopColor="#2F8F8A" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#2F8F8A" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="heat3" cx="45%" cy="70%">
              <stop offset="0%" stopColor="#548FB3" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#548FB3" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="30%" cy="40%" r="20%" fill="url(#heat1)" />
          <circle cx="60%" cy="50%" r="15%" fill="url(#heat2)" />
          <circle cx="45%" cy="70%" r="18%" fill="url(#heat3)" />
        </svg>

        {/* City Infrastructure Outline */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {/* Infrastructure zone shapes */}
          <motion.rect
            x="15"
            y="25"
            width="20"
            height="15"
            fill="rgba(84, 143, 179, 0.08)"
            stroke="rgba(38, 101, 140, 0.4)"
            strokeWidth="0.5"
            rx="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
          />
          <motion.rect
            x="55"
            y="40"
            width="25"
            height="18"
            fill="rgba(63, 127, 107, 0.08)"
            stroke="rgba(35, 83, 71, 0.4)"
            strokeWidth="0.5"
            rx="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.7 }}
          />
          <motion.rect
            x="30"
            y="60"
            width="22"
            height="20"
            fill="rgba(47, 143, 138, 0.08)"
            stroke="rgba(47, 143, 138, 0.4)"
            strokeWidth="0.5"
            rx="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.9 }}
          />
        </svg>

        {/* Issue Markers */}
        {mockIssues.map((issue, index) => (
          <motion.div
            key={issue.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 1 + index * 0.15,
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            className="absolute"
            style={{
              left: `${issue.x}%`,
              top: `${issue.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            onMouseEnter={() => setHoveredIssue(issue.id)}
            onMouseLeave={() => setHoveredIssue(null)}
          >
            {/* Pulsing Ring */}
            <motion.div
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={`absolute inset-0 rounded-full bg-gradient-to-r ${getIssueColor(issue.type)} blur-md`}
              style={{ width: "40px", height: "40px", margin: "-10px" }}
            />

            {/* Core Marker */}
            <motion.div
              whileHover={{ scale: 1.2 }}
              className={`relative w-5 h-5 rounded-full bg-gradient-to-br ${getIssueColor(issue.type)} shadow-lg cursor-pointer border-2 border-white/30`}
            >
              {/* Inner Glow */}
              <div className="absolute inset-0 rounded-full bg-white/40 blur-sm" />
            </motion.div>

            {/* Label */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: hoveredIssue === issue.id ? 1 : 0,
                y: hoveredIssue === issue.id ? -40 : -30,
              }}
              transition={{ duration: 0.2 }}
              className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
            >
              <div className="px-3 py-1.5 rounded-xl bg-[#023859]/95 backdrop-blur-md border border-[#548FB3]/30 shadow-xl">
                <span className="text-xs font-medium text-white">
                  {issue.label}
                </span>
              </div>
              <div className="w-2 h-2 bg-[#023859]/95 rotate-45 mx-auto -mt-1 border-r border-b border-[#548FB3]/30" />
            </motion.div>
          </motion.div>
        ))}

        {/* Scanning Line Effect */}
        <motion.div
          animate={{
            top: ["0%", "100%", "0%"],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#b91c1c] to-transparent opacity-60"
        />

        {/* Corner Brackets */}
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-[#26658C]/50 rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-[#26658C]/50 rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-[#26658C]/50 rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-[#26658C]/50 rounded-br-lg" />

        {/* Info Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <div className="space-y-1">
            <div className="text-xs text-[#355E6B]/70">Bilaspur, Chhattisgarh</div>
            <div className="text-sm font-semibold text-[#0F2A33]">
              22.0836°N, 82.1540°E
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#EF4444] to-[#B91C1C]" />
              <span className="text-xs text-[#355E6B]">Critical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#F97316] to-[#EA580C]" />
              <span className="text-xs text-[#355E6B]">Warning</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating Stats */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute -right-4 top-1/4 bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] backdrop-blur-xl border border-[#A3C6BE]/40 rounded-2xl p-4"
        style={{
          boxShadow: "0 8px 24px -4px rgba(111, 163, 154, 0.3), inset 0 1px 0 rgba(255,255,255,0.5)"
        }}
      >
        <div className="text-xs text-[#355E6B]/70 mb-2">Active Issues</div>
        <div className="text-3xl font-bold text-[#0F2A33] mb-1">
          {mockIssues.length}
        </div>
        <div className="flex items-center gap-1 text-xs text-[#3F7F6B]">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
              clipRule="evenodd"
            />
          </svg>
          <span>2 Critical</span>
        </div>
      </motion.div>
    </div>
  );
}
