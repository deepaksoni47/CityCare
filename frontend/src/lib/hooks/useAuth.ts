import { useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  cityId: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("citycare_token");
      localStorage.removeItem("citycare_user");
      setUser(null);
      window.dispatchEvent(new Event("citycare_auth_changed"));
    }
  };

  const getToken = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("citycare_token");
  };

  const isAuthenticated = (): boolean => {
    return user !== null;
  };

  const refreshToken = (): void => {
    // CityCare uses backend-managed tokens; this is a no-op
    // Token refresh is handled by the backend
  };

  useEffect(() => {
    // Check for stored user data
    const userStr =
      typeof window !== "undefined"
        ? window.localStorage.getItem("citycare_user")
        : null;

    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          cityId: userData.cityId,
        });
      } catch (error) {
        console.error("Failed to parse user data:", error);
      }
    }

    setLoading(false);
  }, []);

  return { user, loading, logout, getToken, isAuthenticated, refreshToken };
}
