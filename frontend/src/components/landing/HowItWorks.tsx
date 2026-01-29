"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { GraduationCap } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "City Selection",
    description: "Users enter a verified city environment",
    detail: "Example: Bilaspur, Chhattisgarh",
    icon: <GraduationCap />,
    color: "blue",
  },
  {
    number: "02",
    title: "Real-Time Visibility",
    description: "Issues appear instantly on a geospatial heatmap",
    detail: "Mapped down to zone → infrastructure layer → specific location",
    icon: "🗺️",
    color: "cyan",
  },
  {
    number: "03",
    title: "Priority Intelligence",
    description:
      "Dynamic priority queue ranks issues by severity, impact, and risk",
    detail: "AI-powered urgency scoring",
    icon: "⚡",
    color: "amber",
  },
  {
    number: "04",
    title: "Resolution & Accountability",
    description: "Authorized users mark issues as resolved with proof",
    detail: "The heatmap updates immediately",
    icon: "✓",
    color: "emerald",
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeStep, setActiveStep] = useState(0);

  // Subdued accent color for doc headings and anchors
  const accent = "#aeb6c2"; // neutral doc gray

  // Muted background for icon anchors
  const iconBg = "bg-[#191a20]";

  // Step label as doc heading
  const labelColor = "text-[#b2b7c2] tracking-widest uppercase";

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="relative py-20 px-6 overflow-hidden"
    >
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(84,143,179,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(84,143,179,0.08)_1px,transparent_1px)] bg-[size:100px_100px] -z-10" />

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-[#0F2A33]">How It </span>
            <span
              className="bg-clip-text text-transparent"
              style={{
                background: "linear-gradient(90deg, #3F7F6B 0%, #2F8F8A 50%, #26658C 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "none",
              }}
            >
              Actually Works
            </span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: "#355E6B" }}>
            From incident to insight. Four steps. Zero confusion.
          </p>
        </div>

        {/* Steps Timeline */}
        <div className="grid md:grid-cols-4 gap-8 relative">
          {/* Subtle Linear Connector */}
          <div
            className="hidden md:block absolute top-24 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, rgba(63, 127, 107, 0.2) 0%, rgba(47, 143, 138, 0.2) 50%, rgba(84, 143, 179, 0.2) 100%)",
            }}
          />
          {steps.map((step, index) => {
            // Editorial, system-driven, embedded process cards
            // Clay surface progression by step index
            const baseBg = ["#BFE3D5", "#B5DFD0", "#ABDACB", "#9ECFC2"][index];
            const insetShadow =
              "0 8px 24px -4px rgba(111, 163, 154, 0.2), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 4px rgba(111, 163, 154, 0.1)";
            const accentEdge =
              index === 0
                ? ""
                : `linear-gradient(180deg, #3F7F6B 0%, transparent 100%)`;
            return (
              <div
                key={step.number}
                className="relative group cursor-default"
                style={{
                  zIndex: 1,
                  background: baseBg,
                  boxShadow: insetShadow,
                  borderRadius: 18,
                  minHeight: 220,
                  padding: "2.1rem 2rem 2rem 2.5rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  position: "relative",
                  overflow: "hidden",
                  marginTop: index > 0 ? -8 : 0,
                }}
              >
                {/* Structural accent: thin left edge for all but first */}
                {index > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 3,
                      borderRadius: 2,
                      background: accentEdge,
                      opacity: 0.18,
                    }}
                  />
                )}
                {/* Step Icon Anchor (static, minimal) */}
                <div
                  className="w-10 h-10 mb-4 flex items-center justify-center rounded-full"
                  style={{
                    background: "linear-gradient(135deg, #9ECFC2 0%, #78B6A8 100%)",
                    boxShadow: "0 4px 12px -2px rgba(111, 163, 154, 0.3), inset 0 1px 0 rgba(255,255,255,0.4)",
                    marginBottom: 18,
                    alignSelf: "flex-start",
                  }}
                >
                  <span
                    style={{
                      color: "#235347",
                      fontSize: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {typeof step.icon === "string" ? step.icon : step.icon}
                  </span>
                </div>
                {/* Step Label as doc marker */}
                <div
                  className="text-[13px] font-semibold mb-2"
                  style={{
                    letterSpacing: "0.13em",
                    fontWeight: 600,
                    color: "#355E6B",
                    opacity: 0.7,
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  STEP {step.number} / PROCESS
                </div>
                {/* Title */}
                <h3
                  className="text-lg font-bold mb-2"
                  style={{
                    color: "#0F2A33",
                    fontWeight: 700,
                    letterSpacing: 0.01,
                    marginBottom: 8,
                  }}
                >
                  {step.title}
                </h3>
                {/* Description */}
                <p
                  className="text-[15px] mb-3"
                  style={{
                    color: "#355E6B",
                    lineHeight: 1.75,
                    fontWeight: 400,
                    maxWidth: 340,
                    marginBottom: 10,
                  }}
                >
                  {step.description}
                </p>
                {/* Inline annotation for detail/example */}
                <span
                  className="inline-block text-xs italic px-2 py-1 rounded"
                  style={{
                    color: "#7A9DA8",
                    fontWeight: 400,
                    marginTop: 2,
                    background: "none",
                    border: "none",
                  }}
                >
                  {step.detail}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#9ECFC2] border border-[#A3C6BE] text-[#0F2A33] font-semibold transition-colors duration-200 hover:bg-[#78B6A8] hover:border-[#6FA39A]"
            style={{ boxShadow: "0 4px 16px -2px rgba(111, 163, 154, 0.25), inset 0 1px 0 rgba(255,255,255,0.4)" }}
          >
            <span>Scroll to Explore</span>
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#355E6B"
              style={{ opacity: 0.6 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </p>
        </div>
      </div>
    </section>
  );
}
