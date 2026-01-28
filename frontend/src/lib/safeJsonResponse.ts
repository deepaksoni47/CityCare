/**
 * Safely parse JSON responses with helpful error messages
 */
export async function safeJsonResponse(
  response: Response,
  context?: string,
): Promise<any> {
  const contentType = response.headers.get("content-type") || "";

  // Check if response is actually JSON
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    console.error(
      `[${context || "API"}] Non-JSON response (${response.status}):`,
      text.slice(0, 200),
    );

    // If HTML error page, try to extract useful info
    if (text.includes("<!DOCTYPE")) {
      throw new Error(
        `API returned HTML error (${response.status}). Check if API_BASE_URL is correct and backend is running.`,
      );
    }

    throw new Error(
      `API returned non-JSON response (${response.status}): ${text.slice(0, 100)}`,
    );
  }

  try {
    return await response.json();
  } catch (parseError) {
    console.error(
      `[${context || "API"}] JSON parse error (${response.status}):`,
      parseError,
    );
    throw new Error(
      `Failed to parse API response as JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
    );
  }
}
