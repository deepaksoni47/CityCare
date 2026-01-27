"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_CITY_ID } from "@/data/cities";

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL)
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
};

type Status = "loading" | "error";

export default function GoogleOAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cityId =
    searchParams.get("cityId") ||
    (state && state.trim().length > 0 ? state : null) ||
    DEFAULT_CITY_ID;

  useEffect(() => {
    const finishOAuth = async () => {
      if (!code) {
        setStatus("error");
        setError("Missing authorization code from Google.");
        return;
      }

      if (!cityId) {
        setStatus("error");
        setError("Missing city identifier for sign-in.");
        return;
      }

      const apiBaseUrl = getApiBaseUrl();

      if (!apiBaseUrl) {
        setStatus("error");
        setError("Missing API base URL configuration.");
        return;
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/auth/oauth/google/callback`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, cityId }),
          },
        );

        const data = await response.json();

        if (
          !response.ok ||
          !data?.success ||
          !data?.data?.accessToken ||
          !data?.data?.user
        ) {
          const message =
            data?.message ||
            data?.error ||
            "Unable to complete Google sign-in.";
          throw new Error(message);
        }

        if (typeof window !== "undefined") {
          const rawUser = data.data.user as any;
          const normalizedUser = {
            ...rawUser,
            id: rawUser?.id || rawUser?._id || rawUser?.userId || "",
            cityId: rawUser?.cityId || cityId,
          };

          window.localStorage.setItem("citycare_token", data.data.accessToken);
          window.localStorage.setItem(
            "citycare_user",
            JSON.stringify(normalizedUser),
          );
          if (data.data.refreshToken) {
            window.localStorage.setItem(
              "citycare_refresh_token",
              data.data.refreshToken,
            );
          }
          try {
            window.dispatchEvent(new Event("citycare_auth_changed"));
          } catch (_) {
            /* ignore */
          }
        }

        router.replace("/dashboard");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unexpected error during Google sign-in.";
        setError(message);
        setStatus("error");
      }
    };

    void finishOAuth();
  }, [code, cityId, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#050814] text-white px-4">
      <div className="w-full max-w-md text-center space-y-4">
        {status === "loading" ? (
          <>
            <div className="mx-auto h-12 w-12 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">
                Completing Google sign-in
              </h1>
              <p className="text-sm text-white/70">
                Please wait while we finalize your login and set up your
                CityCare session.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/20 text-rose-200 flex items-center justify-center text-2xl">
              !
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Sign-in failed</h1>
              <p className="text-sm text-white/70">
                {error ||
                  "We could not complete Google sign-in. Please try again."}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => router.replace("/login")}
                  className="px-4 py-2 rounded-lg bg-white/10 border border-white/15 text-sm font-medium hover:bg-white/15"
                >
                  Back to login
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-gray-100"
                >
                  Retry
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
