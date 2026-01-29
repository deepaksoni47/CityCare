"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation"; // Added usePathname
import Image from "next/image";

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL)
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
};

export function FloatingNav() {
  const router = useRouter();
  const pathname = usePathname(); // Get current path
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { scrollY } = useScroll();

  const backgroundBlur = useTransform(scrollY, [0, 100], [0.3, 0.5]);

  // --- HELPER FOR ACTIVE STYLES ---
  // This function returns the class string based on whether the path matches
  const getNavLinkClass = (path: string) => {
    const isActive = pathname === path;
    return `
    px-5 py-2 rounded-2xl text-sm font-semibold transition-all
    ${
      isActive
        ? "bg-gradient-to-r from-[#3F7F6B] to-[#2F8F8A] text-white shadow-lg shadow-[#3F7F6B]/25"
        : "text-[#0F2A33] hover:text-[#26658C] hover:bg-white/30"
    }
  `;
  };

  // Helper for Bottom Tab Navigation (Mobile/Tablet)
  const getBottomTabClass = (path: string) => {
    const isActive = pathname === path;
    return `
    flex-1 flex flex-col items-center justify-center py-2 px-1 transition-all
    ${isActive ? "text-[#3F7F6B]" : "text-white/60 hover:text-white/80"}
  `;
  };

  // Check authentication state
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== "undefined") {
        const token = window.localStorage.getItem("citycare_token");
        const userStr = window.localStorage.getItem("citycare_user");

        if (token) {
          setIsLoggedIn(true);
          if (userStr) {
            try {
              const user = JSON.parse(userStr);
              setUserName(user.name || user.displayName || user.email || null);
              setUserRole(user.role || null);
            } catch {
              setUserName(null);
              setUserRole(null);
            }
          }
        } else {
          setIsLoggedIn(false);
          setUserName(null);
          setUserRole(null);
        }
      }
    };

    checkAuth();

    window.addEventListener("storage", checkAuth);
    window.addEventListener("citycare_auth_changed", checkAuth);
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("citycare_auth_changed", checkAuth);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      const token = window.localStorage.getItem("citycare_token");

      if (token) {
        try {
          await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
        } catch (err) {
          console.warn("Backend logout failed, continuing:", err);
        }
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("citycare_token");
        window.localStorage.removeItem("citycare_user");
      }

      setIsLoggedIn(false);
      setUserName(null);
      setIsMobileMenuOpen(false);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("citycare_token");
        window.localStorage.removeItem("citycare_user");
      }
      setIsLoggedIn(false);
      setUserName(null);
      router.push("/");
    }
  };

  return (
    <>
      {/* Desktop Navigation - Top Floating */}
      <motion.nav
        className={`
          hidden lg:flex
          fixed top-4 md:top-6 left-1/2 z-50
          transition-all duration-300
          transform -translate-x-1/2
        `}
      >
        <div className="flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-3xl bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] backdrop-blur-xl border-4 border-white/60 shadow-[0_8px_16px_rgba(63,127,107,0.15),inset_0_-2px_8px_rgba(255,255,255,0.6),inset_0_2px_8px_rgba(0,0,0,0.05)]">
          {/* Logo */}
          <motion.a
            href="/"
            className="flex items-center gap-2 px-2 md:px-3 py-2 rounded-full hover:bg-white/20 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-7 h-7 md:w-8 md:h-8 relative rounded-lg overflow-hidden">
              <Image
                src="/logo.png"
                alt="CityCare"
                fill={false}
                width={32}
                height={32}
                className="object-cover"
              />
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-bold text-sm md:text-base bg-gradient-to-r from-[#26658C] to-[#3F7F6B] bg-clip-text text-transparent">
                CityCare
              </span>
              <div className="w-px h-6 bg-[#0F2A33]/20" />
              <div className="w-px h-6 bg-[#0F2A33]/15" />
            </div>
          </motion.a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 w-full">
            <div className="flex items-center gap-2">
              {/* Action Buttons - Desktop (left side) */}
              {isLoggedIn && (
                <>
                  <motion.a
                    href="/dashboard"
                    className={getNavLinkClass("/dashboard")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Dashboard
                  </motion.a>
                  <motion.a
                    href="/report"
                    className={getNavLinkClass("/report")}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Report Issue
                  </motion.a>
                  {userRole === "admin" && (
                    <motion.a
                      href="/admin"
                      className={getNavLinkClass("/admin")}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Admin
                    </motion.a>
                  )}
                </>
              )}

              <motion.a
                href="/heatmap"
                className={getNavLinkClass("/heatmap")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Heatmap
              </motion.a>

              <motion.a
                href="/priority"
                className={getNavLinkClass("/priority")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Priority
              </motion.a>
            </div>

            <div className="flex-1" />

            {/* Right side: user name (rightmost) or login button */}
            {isLoggedIn && userName ? (
              <div className="hidden md:flex items-center">
                <div className="w-px h-6 bg-[#0F2A33]/20 mr-4" />
                <div className="w-px h-6 bg-[#0F2A33]/15 mr-4" />
                <motion.a
                  href="/profile"
                  className={`
                    px-4 py-2 text-sm font-semibold transition-all rounded-2xl 
                    ${
                      pathname === "/profile"
                        ? "bg-gradient-to-r from-[#3F7F6B] to-[#2F8F8A] text-white shadow-lg shadow-[#3F7F6B]/25"
                        : "text-[#0F2A33] hover:text-[#26658C] hover:bg-white/30"
                    }
                  `}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  title="View Profile"
                >
                  {userName}
                </motion.a>
              </div>
            ) : (
              <motion.a
                href="/login"
                className="px-6 py-2 rounded-2xl bg-gradient-to-r from-[#3F7F6B] to-[#2F8F8A] hover:from-[#2F8F8A] hover:to-[#235347] text-white text-sm font-semibold shadow-lg shadow-[#3F7F6B]/25 transition-all"
                whileHover={{
                  scale: 1.05,
                }}
                whileTap={{ scale: 0.95 }}
              >
                Login
              </motion.a>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Mobile & Tablet - Bottom Tab Navigation */}
      <motion.nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <div className="bg-[#0F2A33]/98 backdrop-blur-xl border-t border-[#3F7F6B]/30 shadow-2xl shadow-[#023859]/50">
          <div className="flex items-center justify-around px-2 py-1 max-w-lg mx-auto">
            {/* Dashboard/Home Tab */}
            {isLoggedIn && (
              <motion.a
                href="/dashboard"
                className={getBottomTabClass("/dashboard")}
                whileTap={{ scale: 0.9 }}
              >
                <svg
                  className="w-6 h-6 mb-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                <span className="text-xs font-medium">Home</span>
              </motion.a>
            )}

            {/* Heatmap Tab */}
            <motion.a
              href="/heatmap"
              className={getBottomTabClass("/heatmap")}
              whileTap={{ scale: 0.9 }}
            >
              <svg
                className="w-6 h-6 mb-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              <span className="text-xs font-medium">Map</span>
            </motion.a>

            {/* Report Tab - Center with elevated button */}
            {isLoggedIn && (
              <motion.a
                href="/report"
                className="relative -mt-6"
                whileTap={{ scale: 0.95 }}
              >
                <div
                  className={`
                  w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl
                  ${
                    pathname === "/report"
                      ? "bg-gradient-to-br from-[#3F7F6B] to-[#2F8F8A] shadow-[#3F7F6B]/40"
                      : "bg-gradient-to-br from-[#26658C] to-[#548FB3] shadow-[#26658C]/30"
                  }
                `}
                >
                  <svg
                    className="w-7 h-7 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
              </motion.a>
            )}

            {/* Priority Tab */}
            <motion.a
              href="/priority"
              className={getBottomTabClass("/priority")}
              whileTap={{ scale: 0.9 }}
            >
              <svg
                className="w-6 h-6 mb-1"
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
              <span className="text-xs font-medium">Priority</span>
            </motion.a>

            {/* Profile/Login Tab */}
            <motion.a
              href={isLoggedIn ? "/profile" : "/login"}
              className={getBottomTabClass(isLoggedIn ? "/profile" : "/login")}
              whileTap={{ scale: 0.9 }}
            >
              <svg
                className="w-6 h-6 mb-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="text-xs font-medium">
                {isLoggedIn ? "Profile" : "Login"}
              </span>
            </motion.a>
          </div>
        </div>
      </motion.nav>
    </>
  );
}
