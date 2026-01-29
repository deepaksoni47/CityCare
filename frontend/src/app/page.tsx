"use client";

import { Hero } from "@/components/landing/Hero";
import { ValueProposition } from "@/components/landing/ValueProposition";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LiveDataTrust } from "@/components/landing/LiveDataTrust";
import { ImpactMetrics } from "@/components/landing/ImpactMetrics";
import { TrustAccess } from "@/components/landing/TrustAccess";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#DDF3E6] via-[#CFEAF0] to-[#BFE3D5] text-[#0F2A33] overflow-x-hidden">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#7CBFD0]/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-[#3F7F6B]/12 rounded-full blur-3xl animate-pulse-slower" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-[#2F8F8A]/8 rounded-full blur-3xl animate-float" />
      </div>

      {/* Hero Section */}
      <Hero />

      {/* Value Proposition */}
      <ValueProposition />

      {/* How It Works */}
      <HowItWorks />

      {/* Live Data Trust */}
      <LiveDataTrust />

      {/* Impact Metrics */}
      <ImpactMetrics />

      {/* Trust & Access */}
      <TrustAccess />

      {/* Final CTA */}
      <FinalCTA />

      {/* Footer */}
      <footer className="border-t border-[#A3C6BE]/40 py-12 px-6 bg-[#BFE3D5]/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#355E6B] text-sm">© 2025 CityCare</p>
          <div className="flex gap-6 text-sm text-[#355E6B]">
            <a href="/privacy" className="hover:text-[#3F7F6B] transition-colors">
              Privacy
            </a>
            <a href="/terms" className="hover:text-[#3F7F6B] transition-colors">
              Terms
            </a>
            <a
              href="/documentation"
              className="hover:text-[#3F7F6B] transition-colors"
            >
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
