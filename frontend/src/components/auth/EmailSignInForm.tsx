"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CITY_OPTIONS, DEFAULT_CITY_ID } from "@/data/cities";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL as string;

interface EmailSignInFormProps {
  cityId?: string;
}

export function EmailSignInForm({ cityId = "bilaspur" }: EmailSignInFormProps) {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("citizen");
  const [selectedCityId, setSelectedCityId] = useState(cityId || "bilaspur");

  useEffect(() => {
    setSelectedCityId(cityId || "bilaspur");
  }, [cityId]);

  const selectedCity =
    CITY_OPTIONS.find((c) => c.id === selectedCityId) || CITY_OPTIONS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const endpoint = isLogin
        ? `${API_BASE_URL}/api/auth/login`
        : `${API_BASE_URL}/api/auth/register`;

      const body = isLogin
        ? { email, password }
        : { email, password, name, cityId: selectedCityId, role };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as {
        success?: boolean;
        data?: { user: any; token: string };
        message?: string;
        error?: string;
      };

      if (!response.ok || !data.success || !data.data?.token) {
        const message = data.message || data.error || "Authentication failed.";
        throw new Error(message);
      }

      // Store token and user data for both login and registration
      if (typeof window !== "undefined") {
        window.localStorage.setItem("citycare_token", data.data.token);
        window.localStorage.setItem(
          "citycare_user",
          JSON.stringify(data.data.user),
        );
      }

      // Notify other components in this tab about auth change
      try {
        window.dispatchEvent(new Event("citycare_auth_changed"));
      } catch (_) {
        /* ignore */
      }

      // Redirect to dashboard for both login and registration
      router.push("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error occurred.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle Login/Register */}
      <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/10">
        <button
          type="button"
          onClick={() => setIsLogin(true)}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
            isLogin
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "text-white/60 hover:text-white/80"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setIsLogin(false)}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
            !isLogin
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "text-white/60 hover:text-white/80"
          }`}
        >
          Join City
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name field (Register only) */}
        {!isLogin && (
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-medium text-white/70 mb-1.5"
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition"
              placeholder="Enter your full name"
            />
          </div>
        )}

        {/* Email field */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium text-white/70 mb-1.5"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition"
            placeholder="you@example.com"
          />
        </div>

        {/* Password field */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium text-white/70 mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition"
            placeholder="••••••••"
          />
          {!isLogin && (
            <p className="mt-1 text-xs text-white/40">Minimum 6 characters</p>
          )}
        </div>

        {/* Role selection (Register only) */}
        {!isLogin && (
          <div>
            <label
              htmlFor="role"
              className="block text-xs font-medium text-white/70 mb-1.5"
            >
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition"
            >
              <option value="citizen">Citizen</option>
              <option value="volunteer">Volunteer</option>
              <option value="agency">Agency Representative</option>
              <option value="admin">Admin</option>
            </select>
            <p className="mt-1 text-xs text-white/40">
              Choose your role in the city
            </p>
          </div>
        )}

        {/* City info (Register only) */}
        {!isLogin && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs text-emerald-300">
              <span className="font-semibold">City:</span> {selectedCity.name}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30">
            <p className="text-xs text-rose-300">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading
            ? isLogin
              ? "Signing in..."
              : "Creating account..."
            : isLogin
              ? "Sign In"
              : "Join City"}
        </button>
      </form>
    </div>
  );
}
