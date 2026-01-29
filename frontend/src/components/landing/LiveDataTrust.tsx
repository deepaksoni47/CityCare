"use client";
import { useRef } from "react";

export function LiveDataTrust() {
  const ref = useRef(null);
  return (
    <section ref={ref} className="relative py-20 px-6 overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(84,143,179,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(84,143,179,0.08)_1px,transparent_1px)] bg-[size:100px_100px]" />
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-[#0F2A33]">
            Built on{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#3F7F6B] via-[#2F8F8A] to-[#26658C]">
              Verified Spatial Intelligence
            </span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto text-[#355E6B]">
            The system operates on precise spatial boundaries, hierarchies, and
            real-world layouts. Accuracy, validation, and structure are
            foundational—never optional.
          </p>
        </div>
        {/* System Spatial Layers */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {[
            {
              label: "City boundary layer",
              desc: "Defines the outer perimeter for all spatial logic.",
            },
            {
              label: "Zone footprint layer",
              desc: "Maps every district as a discrete, validated entity.",
            },
            {
              label: "Infrastructure and location resolution",
              desc: "Supports granular infrastructure type mapping and navigation.",
            },
            {
              label: "Issue-to-location binding",
              desc: "Every report is anchored to a real, validated place.",
            },
          ].map((layer) => (
            <div
              key={layer.label}
              className="p-7 rounded-2xl"
              style={{
                background:
                  "linear-gradient(145deg, #BFE3D5 0%, #9ECFC2 100%)",
                boxShadow:
                  "0 8px 24px -4px rgba(111, 163, 154, 0.2), inset 0 1px 0 rgba(255,255,255,0.5)",
                border: "1px solid rgba(163, 198, 190, 0.4)",
              }}
            >
              <div
                className="text-xs font-semibold uppercase tracking-widest text-[#26658C] mb-2"
                style={{ opacity: 0.8, letterSpacing: "0.13em" }}
              >
                {layer.label}
              </div>
              <div
                className="text-[15px] text-[#355E6B] leading-relaxed"
              >
                {layer.desc}
              </div>
            </div>
          ))}
        </div>
        {/* System Guarantees */}
        <div className="grid md:grid-cols-4 gap-6">
          {[
            "Boundary-locked issue reporting",
            "Location-aware validation",
            "Hierarchical spatial mapping",
            "Multi-city ready architecture",
          ].map((guarantee) => (
            <div
              key={guarantee}
              className="p-5 rounded-xl"
              style={{
                background:
                  "linear-gradient(145deg, #9ECFC2 0%, #78B6A8 100%)",
                boxShadow: "0 4px 16px -2px rgba(111, 163, 154, 0.2), inset 0 1px 0 rgba(255,255,255,0.4)",
                border: "1px solid rgba(163, 198, 190, 0.4)",
              }}
            >
              <div
                className="text-xs text-[#0F2A33] tracking-wide font-medium"
              >
                {guarantee}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
