"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { EmailSignInForm } from "@/components/auth/EmailSignInForm";
import { isTokenValid } from "@/lib/tokenManager";
import { CITY_OPTIONS, DEFAULT_CITY_ID } from "@/data/cities";

export default function LoginPage() {
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<"google" | "email">("google");
  const [registered, setRegistered] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState(DEFAULT_CITY_ID);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Use centralized token validation
      if (isTokenValid()) {
        router.replace("/dashboard");
        return;
      }

      // Read `registered` from the URL query string on client only
      try {
        const sp = new URLSearchParams(window.location.search);
        const reg = sp.get("registered");
        setRegistered(reg);
      } catch (e) {
        setRegistered(null);
      }
    }
  }, [router]);

  const selectedCity =
    CITY_OPTIONS.find((c) => c.id === selectedCityId) ||
    CITY_OPTIONS.find((c) => c.id === DEFAULT_CITY_ID) ||
    CITY_OPTIONS[0];

  return (
    <main className=" relative min-h-screen bg-gradient-to-br from-[#DDF3E6] via-[#CFEAF0] to-[#BFE3D5] text-[#0F2A33] overflow-hidden flex items-center justify-center px-4">
      {/* Ambient background effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-[#7CBFD0]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[36rem] h-[36rem] bg-[#6FCFC3]/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] bg-[#2F8F8A]/10 rounded-full blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-md ">
        <div className="mb-8 text-center pt-40">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#0F2A33]">
            Welcome to
            <span className="ml-2 bg-gradient-to-r from-[#3F7F6B] via-[#2F8F8A] to-[#26658C] bg-clip-text text-transparent">
              CityCare
            </span>
          </h1>
          <p className="mt-3 text-sm text-[#355E6B] max-w-sm mx-auto">
            Sign in with your Google account or email to report infrastructure
            issues, view heatmaps, and collaborate with your city.
          </p>
        </div>

        <div 
          className="relative rounded-3xl border border-[#A3C6BE]/40 bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] backdrop-blur-xl p-6 md:p-8 space-y-6"
          style={{
            boxShadow: "0 8px 32px -4px rgba(111, 163, 154, 0.25), 0 4px 16px -2px rgba(84, 143, 179, 0.15), inset 0 1px 0 rgba(255,255,255,0.5)"
          }}
        >
          {registered === "1" && (
            <div className="mb-2 p-3 rounded-lg bg-[#3F7F6B]/20 border border-[#3F7F6B]/40 text-[#235347]">
              Account created successfully — please sign in with your new
              credentials.
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="city"
              className="block text-[11px] sm:text-xs font-medium text-[#355E6B] uppercase tracking-[0.18em]"
            >
              Select Your City
            </label>
            <select
              id="city"
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/60 border border-[#A3C6BE]/50 text-[#0F2A33] text-sm sm:text-base focus:outline-none focus:border-[#3F7F6B]/50 focus:ring-1 focus:ring-[#3F7F6B]/50 transition min-w-0"
              style={{
                boxShadow: "inset 0 1px 2px rgba(111, 163, 154, 0.1)"
              }}
            >
              {CITY_OPTIONS.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}, {city.state}
                </option>
              ))}
            </select>
            <p className="text-[11px] sm:text-xs text-[#355E6B]">
              We will link your account and center the heatmap around{" "}
              <span className="font-semibold text-[#3F7F6B]">
                {selectedCity?.name || "your city"}
              </span>
              .
            </p>
          </div>

          {/* Authentication Method Tabs */}
          <div 
            className="flex gap-2 p-1 bg-white/40 rounded-xl border border-[#A3C6BE]/30"
            style={{
              boxShadow: "inset 0 1px 2px rgba(111, 163, 154, 0.1)"
            }}
          >
            <button
              type="button"
              onClick={() => setAuthMethod("google")}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                authMethod === "google"
                  ? "bg-gradient-to-br from-[#3F7F6B] to-[#235347] text-white shadow-md"
                  : "text-[#355E6B] hover:text-[#0F2A33] hover:bg-white/50"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                </svg>
                Google
              </div>
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod("email")}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                authMethod === "email"
                  ? "bg-gradient-to-br from-[#3F7F6B] to-[#235347] text-white shadow-md"
                  : "text-[#355E6B] hover:text-[#0F2A33] hover:bg-white/50"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Email
              </div>
            </button>
          </div>

          {authMethod === "google" ? (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#355E6B] uppercase tracking-[0.18em]">
                  Single sign-on
                </p>
                <p className="text-sm text-[#355E6B]">
                  Use your verified Google identity. We'll automatically create
                  or link your CityCare profile for{" "}
                  <span className="font-semibold text-[#3F7F6B]">
                    {selectedCity?.name || "your city"}
                  </span>
                  .
                </p>
              </div>

              <GoogleSignInButton cityId={selectedCityId} />
            </>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#355E6B] uppercase tracking-[0.18em]">
                  Email Authentication
                </p>
                <p className="text-sm text-[#355E6B]">
                  Sign in with your email and password, or create a new account
                  for{" "}
                  <span className="font-semibold text-[#3F7F6B]">
                    {selectedCity?.name || "your city"}
                  </span>
                  .
                </p>
              </div>

              <EmailSignInForm cityId={selectedCityId} />
            </>
          )}

          <p className="text-[11px] text-[#7A9DA8] leading-relaxed">
            Authentication is powered by CityCare's secure authentication system
            and Google OAuth. We never store your passwords.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[#355E6B]">
          Want to explore without signing in?{" "}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-[#3F7F6B] hover:text-[#235347] hover:underline decoration-dotted font-medium"
          >
            Back to public experience
          </button>
        </p>
      </section>
    </main>
  );
}
