"use client";

import { RewardsProfile } from "@/components/rewards/RewardsProfile";
import { BadgesGrid } from "@/components/rewards/BadgeCard";
import { useAuth } from "@/lib/hooks/useAuth";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Award } from "lucide-react";

export default function ProfileRewardsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "badges">("overview");

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center">
        <div className="text-center py-12">
          <p className="text-white/60 mb-4">
            Please sign in to view your rewards
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen bg-[#050814] text-white overflow-hidden pb-20">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[36rem] h-[36rem] bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1f2937_0,_#020617_55%,_#020617_100%)] opacity-60" />
      </div>

      <div className="container mx-auto px-4 pt-24 md:pt-32 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
              Rewards &{" "}
              <span className="gradient-heading bg-clip-text text-transparent">
                Achievements
              </span>
            </h1>
            <p className="text-white/60 text-base md:text-lg">
              Track your progress, earn badges, and climb the leaderboard
            </p>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-2 md:gap-4 mb-8"
          >
            {[
              { id: "overview", label: "Overview", icon: <Trophy /> },
              { id: "badges", label: "All Badges", icon: <Award /> },
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-medium transition-all text-sm md:text-base flex flex-row justify-center ${
                  activeTab === id
                    ? "bg-gradient-to-r from-indigo-500 to-violet-800 text-white shadow-lg"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                <span className="mr-2">{icon}</span>
                {label}
              </button>
            ))}
          </motion.div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8"
            >
              {activeTab === "overview" && <RewardsProfile />}
              {activeTab === "badges" && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Badge Collection
                  </h2>
                  <p className="text-white/60 mb-6">
                    Complete challenges to unlock badges and earn reward points
                  </p>
                  <BadgesGrid userId={user.id} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
