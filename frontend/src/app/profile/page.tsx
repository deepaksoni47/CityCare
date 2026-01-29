"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ProfileInfo from "@/components/profile/ProfileInfo";
import ChangePassword from "@/components/profile/ChangePassword";
import { RewardsProfile } from "@/components/rewards/RewardsProfile";
import { BadgesGrid } from "@/components/rewards/BadgeCard";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { ChartNoAxesColumn, Key, User, Trophy, Award } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  cityId: string;
  phone?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "profile" | "rewards" | "badges" | "leaderboard" | "password"
  >("profile");

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("citycare_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    // Load user data from localStorage
    const userStr = localStorage.getItem("citycare_user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error("Failed to parse user data:", error);
      }
    }

    // Check for tab parameter in URL or hash
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    const hash = window.location.hash.replace("#", "");

    if (
      tabParam &&
      ["profile", "rewards", "badges", "leaderboard", "password"].includes(
        tabParam,
      )
    ) {
      setActiveTab(tabParam as any);
    } else if (
      hash &&
      ["profile", "rewards", "badges", "leaderboard", "password"].includes(hash)
    ) {
      setActiveTab(hash as any);
    }

    setLoading(false);
  }, [router]);

  const handleUserUpdate = (updatedUser: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedUser };
      setUser(newUser);
      localStorage.setItem("citycare_user", JSON.stringify(newUser));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#DDF3E6] to-[#CFEAF0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3F7F6B]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#DDF3E6] to-[#CFEAF0] text-[#0F2A33] overflow-hidden pb-20">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-[#3F7F6B]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[36rem] h-[36rem] bg-[#7CBFD0]/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 pt-24 md:pt-32 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
                  My{" "}
                  <span className="bg-gradient-to-r from-[#3F7F6B] to-[#26658C] bg-clip-text text-transparent">
                    Profile
                  </span>
                </h1>
                <p className="text-[#355E6B] text-base md:text-lg">
                  Manage your account, track achievements, and view leaderboard
                </p>
              </div>

              <div className="mt-4 md:mt-0">
                <button
                  onClick={async () => {
                    localStorage.removeItem("citycare_token");
                    localStorage.removeItem("citycare_user");
                    window.dispatchEvent(new Event("citycare_auth_changed"));
                    router.push("/");
                  }}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#26658C] to-[#023859] hover:from-[#023859] hover:to-[#011C40] text-white font-medium shadow-lg shadow-[#26658C]/20 transition-all"
                >
                  Logout
                </button>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-2 md:gap-4 mb-8"
          >
            {[
              { id: "profile", label: "Profile Info", icon: <User /> },
              { id: "rewards", label: "Rewards", icon: <Trophy /> },
              { id: "badges", label: "Badges", icon: <Award /> },
              {
                id: "leaderboard",
                label: "Leaderboard",
                icon: <ChartNoAxesColumn />,
              },
              { id: "password", label: "Password", icon: <Key /> },
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`px-4 md:px-6 py-2 md:py-3 rounded-2xl font-medium transition-all text-sm md:text-base flex flex-row justify-center shadow-md ${
                  activeTab === id
                    ? "bg-gradient-to-r from-[#3F7F6B] to-[#2F8F8A] text-white shadow-lg shadow-[#3F7F6B]/20 border border-white/40"
                    : "bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] text-[#355E6B] hover:from-[#9ECFC2] hover:to-[#78B6A8] border border-white/30"
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
              className="bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] backdrop-blur-xl border border-white/40 rounded-3xl p-6 md:p-8 shadow-lg shadow-[#3F7F6B]/10"
            >
              {activeTab === "profile" && (
                <ProfileInfo user={user} onUpdate={handleUserUpdate} />
              )}
              {activeTab === "rewards" && <RewardsProfile />}
              {activeTab === "badges" && (
                <div>
                  <h2 className="text-2xl font-bold text-[#0F2A33] mb-6">
                    Badge Collection
                  </h2>
                  <BadgesGrid userId={user.id} />
                </div>
              )}
              {activeTab === "leaderboard" && (
                <div>
                  <h2 className="text-2xl font-bold text-[#0F2A33] mb-6">
                    Community Leaderboard
                  </h2>
                  <Leaderboard cityId={user.cityId} />
                </div>
              )}
              {activeTab === "password" && <ChangePassword />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
