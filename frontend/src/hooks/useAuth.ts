import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Custom hook for authentication management
 * CityCare uses backend-issued tokens that don't require client-side Firebase refresh
 */
export function useAuth() {
  const router = useRouter();

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("citycare_token");
        window.localStorage.removeItem("citycare_user");
      }
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  }, [router]);

  /**
   * Get current user from localStorage
   */
  const getUser = useCallback(() => {
    if (typeof window !== "undefined") {
      const userStr = window.localStorage.getItem("citycare_user");
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }, []);

  /**
   * Get current token from localStorage
   */
  const getToken = useCallback(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("citycare_token");
    }
    return null;
  }, []);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = useCallback(() => {
    return !!getToken();
  }, [getToken]);

  /**
   * Refresh token (no-op for backend tokens)
   * CityCare tokens are issued by the backend and don't require client-side refresh
   * This is a placeholder for API compatibility
   */
  const refreshToken = useCallback(async () => {
    // Backend tokens are long-lived; no refresh needed on client side
    // If a token is invalid, the API will return 401 and the app will redirect to login
    return Promise.resolve();
  }, []);

  /**
   * Listen to auth change events across tabs
   */
  useEffect(() => {
    const handleAuthChanged = () => {
      // Reload auth state when other tabs change auth
      const user = getUser();
      if (!user && router) {
        router.push("/login");
      }
    };

    window.addEventListener("citycare_auth_changed", handleAuthChanged);

    return () => {
      window.removeEventListener("citycare_auth_changed", handleAuthChanged);
    };
  }, [router, getUser]);

  return {
    logout,
    getUser,
    getToken,
    isAuthenticated,
    refreshToken,
  };
}
