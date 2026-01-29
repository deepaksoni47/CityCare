"use client";

import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { useRef, useEffect } from "react";

interface MetricCardProps {
  value: number;
  suffix: string;
  label: string;
  description: string;
  delay: number;
  gradient: string;
}

function MetricCard({
  value,
  suffix,
  label,
  description,
  delay,
  gradient,
}: MetricCardProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, value, {
        duration: 2,
        delay: delay,
        ease: "easeOut",
      });
      return controls.stop;
    }
  }, [isInView, count, value, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.8, delay }}
      className="group relative"
    >
      {/* Card */}
      <div className="relative h-full p-8 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:border-white/30">
        {/* Animated Background */}
        <motion.div
          className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br ${gradient}`}
          initial={false}
        />

        {/* Glow Effect */}
        <div
          className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${gradient} blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`}
        />

        {/* Content */}
        <div className="relative z-10 space-y-4">
          {/* Icon */}
          <motion.div
            animate={
              isInView
                ? {
                    rotate: [0, 360],
                  }
                : {}
            }
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}
          >
            <svg
              className="w-6 h-6 text-white"
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
          </motion.div>

          {/* Number */}
          <div className="flex items-baseline gap-2">
            <motion.span className="text-6xl font-bold text-white">
              {rounded}
            </motion.span>
            <span
              className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${gradient}`}
            >
              {suffix}
            </span>
          </div>

          {/* Label */}
          <h3 className="text-xl font-bold text-white">{label}</h3>

          {/* Description */}
          <p className="text-white/50 text-sm leading-relaxed">{description}</p>

          {/* Progress Bar */}
          <motion.div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={isInView ? { width: "100%" } : {}}
              transition={{ duration: 2, delay: delay + 0.5 }}
              className={`h-full bg-gradient-to-r ${gradient}`}
            />
          </motion.div>
        </div>
      </div>

      {/* Floating Particles */}
      {isInView && (
        <motion.div
          animate={{
            y: [-20, -40, -20],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-4 right-1/4 w-2 h-2 rounded-full bg-cyan-400/60 blur-sm"
        />
      )}
    </motion.div>
  );
}

const metrics = [
  {
    value: 100,
    suffix: "+",
    label: "Issues Tracked",
    description: "Real-time monitoring across all city infrastructure",
    gradient: "from-lavender-400 to-lavender-300",
  },
  {
    value: 42,
    suffix: "%",
    label: "Faster Resolution",
    description: "Average time reduced through intelligent prioritization",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    value: 89,
    suffix: "",
    label: "High-Risk Zones",
    description: "Identified early through predictive pattern analysis",
    gradient: "from-rose-500 to-orange-600",
  },
  {
    value: 94,
    suffix: "%",
    label: "Prediction Accuracy",
    description: "Rolling model performance validated against actual failures",
    gradient: "from-lavender-400 to-lavender-300",
  },
];

export function ImpactMetrics() {
  // System readout: no cards, no animation, no color reliance
  return (
    <section id="impact" className="relative py-20 px-6 overflow-hidden">
      {/* Subtle background grid */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(84,143,179,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(84,143,179,0.08)_1px,transparent_1px)] bg-[size:100px_100px]" />
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-3 text-[#0F2A33]">
            Numbers That <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#3F7F6B] via-[#2F8F8A] to-[#26658C]">Actually Matter</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto text-[#355E6B] mb-2">
            Real impact. Measured daily. Verified continuously.
          </p>
        </div>
        {/* Subtle horizontal anchor */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#548FB3]/20 to-transparent mb-8" />
        {/* System Metrics Readout */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 relative"
          style={{ minHeight: 180 }}
        >
          {/* Metrics as floating cards */}
          {/* Issues Tracked */}
          <div
            className="bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] border border-[#A3C6BE]/40 rounded-2xl p-8 flex flex-col items-start relative"
            style={{
              boxShadow: "0 8px 24px -4px rgba(111, 163, 154, 0.2), inset 0 1px 0 rgba(255,255,255,0.5)",
              minHeight: 240,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-[#548FB3] mr-2" style={{ boxShadow: "0 4px 12px rgba(84, 143, 179, 0.2)" }}>
                <svg
                  className="w-5 h-5 text-[#548FB3]"
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
              </span>
              <span
                className="text-7xl font-extrabold text-[#0F2A33] tracking-tight"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                100
              </span>
              <span className="text-3xl font-bold text-[#548FB3]">+</span>
            </div>
            <div
              className="text-xs text-[#355E6B] mt-1 tracking-wider uppercase"
              style={{ letterSpacing: "0.09em" }}
            >
              Issues Tracked
            </div>
            <div
              className="text-[13px] text-[#355E6B] mt-0.5"
              style={{ opacity: 0.8 }}
            >
              Real-time monitoring across all infrastructure
            </div>
            <div className="absolute left-0 top-full mt-2 w-20 h-px bg-[#548FB3]/30" />
            <div className="absolute left-0 top-full mt-4 text-[11px] text-[#7A9DA8] tracking-tight">
              Updated: Now
            </div>
          </div>
          {/* Faster Resolution */}
          <div
            className="bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] border border-[#A3C6BE]/40 rounded-2xl p-8 flex flex-col items-center relative"
            style={{
              boxShadow: "0 8px 24px -4px rgba(111, 163, 154, 0.2), inset 0 1px 0 rgba(255,255,255,0.5)",
              minHeight: 240,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-[#3F7F6B] mr-2" style={{ boxShadow: "0 4px 12px rgba(63, 127, 107, 0.2)" }}>
                <svg
                  className="w-5 h-5 text-[#3F7F6B]"
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
              </span>
              <span className="text-7xl font-extrabold text-[#0F2A33] tracking-tight">
                42
              </span>
              <span className="text-3xl font-bold text-[#3F7F6B]">%</span>
            </div>
            <div
              className="text-xs text-[#355E6B] mt-1 tracking-wider uppercase"
              style={{ letterSpacing: "0.09em" }}
            >
              Faster Resolution
            </div>
            <div
              className="text-[13px] text-[#355E6B] mt-0.5"
              style={{ opacity: 0.8 }}
            >
              Avg. time reduced through intelligent prioritization
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-16 h-px bg-[#3F7F6B]/30" />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-4 text-[11px] text-[#7A9DA8] tracking-tight">
              Updated: Now
            </div>
          </div>
          {/* High-Risk Zones */}
          <div
            className="bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] border border-[#A3C6BE]/40 rounded-2xl p-8 flex flex-col items-end relative"
            style={{
              boxShadow: "0 8px 24px -4px rgba(111, 163, 154, 0.2), inset 0 1px 0 rgba(255,255,255,0.5)",
              minHeight: 240,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-[#2F8F8A] mr-2" style={{ boxShadow: "0 4px 12px rgba(47, 143, 138, 0.2)" }}>
                <svg
                  className="w-5 h-5 text-[#2F8F8A]"
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
              </span>
              <span className="text-7xl font-extrabold text-[#0F2A33] tracking-tight">
                89
              </span>
            </div>
            <div
              className="text-xs text-[#355E6B] mt-1 tracking-wider uppercase"
              style={{ letterSpacing: "0.09em" }}
            >
              High-Risk Zones
            </div>
            <div
              className="text-[13px] text-[#355E6B] mt-0.5"
              style={{ opacity: 0.8 }}
            >
              Identified early through predictive pattern analysis
            </div>
            <div className="absolute right-0 top-full mt-2 w-14 h-px bg-[#2F8F8A]/30" />
            <div className="absolute right-0 top-full mt-4 text-[11px] text-[#7A9DA8] tracking-tight">
              Updated: Now
            </div>
          </div>
          {/* Prediction Accuracy */}
          <div
            className="bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] border border-[#A3C6BE]/40 rounded-2xl p-8 flex flex-col items-end relative"
            style={{
              boxShadow: "0 8px 24px -4px rgba(111, 163, 154, 0.2), inset 0 1px 0 rgba(255,255,255,0.5)",
              minHeight: 240,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-[#26658C] mr-2" style={{ boxShadow: "0 4px 12px rgba(38, 101, 140, 0.2)" }}>
                <svg
                  className="w-5 h-5 text-[#26658C]"
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
              </span>
              <span className="text-7xl font-extrabold text-[#0F2A33] tracking-tight">
                94
              </span>
              <span className="text-3xl font-bold text-[#26658C]">%</span>
            </div>
            <div
              className="text-xs text-[#355E6B] mt-1 tracking-wider uppercase"
              style={{ letterSpacing: "0.09em" }}
            >
              Prediction Accuracy
            </div>
            <div
              className="text-[13px] text-[#355E6B] mt-0.5"
              style={{ opacity: 0.8 }}
            >
              Rolling model performance validated against actual failures
            </div>
            <div className="absolute right-0 top-full mt-2 w-14 h-px bg-[#26658C]/30" />
            <div className="absolute right-0 top-full mt-4 text-[11px] text-[#7A9DA8] tracking-tight">
              Updated: Now
            </div>
          </div>
        </div>
        {/* Bottom Note */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#A3C6BE]/40 bg-[#9ECFC2]/50 backdrop-blur-sm" style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)" }}>
            <span className="w-2 h-2 rounded-full bg-[#3F7F6B] opacity-80 animate-pulse" />
            <span className="text-[#0F2A33] text-sm">
              Metrics updated in real-time across all active infrastructure
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
