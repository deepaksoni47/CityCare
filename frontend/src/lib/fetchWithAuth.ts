import { clearAuthTokens } from "@/lib/tokenManager";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL as string;

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("citycare_token");
}

async function tryRefreshToken(): Promise<string | null> {
  // CityCare uses backend tokens without client-side Firebase refresh
  // Token refresh should be handled by the backend or frontend should request a new token
  return null;
}

export async function fetchWithAuth(
  input: string,
  init: RequestInit = {},
  options: { responseType?: "blob" } = {},
) {
  const makeRequest = async (token?: string | null) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((init.headers as Record<string, string>) || {}),
    };
    const effectiveToken = token ?? getAuthToken();
    if (effectiveToken) headers.Authorization = `Bearer ${effectiveToken}`;

    const response = await fetch(
      input.startsWith("http") ? input : `${API_BASE_URL}${input}`,
      {
        ...init,
        headers,
      },
    );

    return response;
  };

  let response = await makeRequest();

  // If unauthorized, try to refresh token and retry once
  if (response.status === 401 || response.status === 403) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      response = await makeRequest(newToken);
    } else {
      // Token refresh failed - clear stored credentials to prevent redirect loop
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("citycare_token");
        window.localStorage.removeItem("citycare_user");
      }

      // Call global handler if present
      if (
        typeof window !== "undefined" &&
        (window as any).__CITYCARE_HANDLE_TOKEN_EXPIRED
      ) {
        try {
          (window as any).__CITYCARE_HANDLE_TOKEN_EXPIRED();
        } catch (e) {}
      }
    }
  }

  if (options.responseType === "blob") {
    if (!response.ok) {
      let text = "";
      try {
        text = await response.text();
      } catch (e) {}
      throw {
        response: {
          data: { message: text || "Request failed" },
        },
      };
    }
    return { data: await response.blob() };
  }

  let data: any = {};
  try {
    data = await response.json();
  } catch (e) {
    data = {};
  }

  if (!response.ok) {
    throw {
      response: {
        data: { message: data?.message || "Request failed" },
      },
    };
  }

  return { data };
}
