"use client";

import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { useAuth } from "@/lib/hooks/useAuth";

export default function LeaderboardPage() {
  const { user } = useAuth();

  // In a real app, you'd get the cityId from user context or URL
  const cityId = user?.cityId || "bilaspur";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 gradient-heading">
          🏆 CityCare Leaderboard
        </h1>
        <p className="text-gray-600">
          See how you rank against other citizens in your city
        </p>
      </div>

      <Leaderboard cityId={cityId} />
    </div>
  );
}
