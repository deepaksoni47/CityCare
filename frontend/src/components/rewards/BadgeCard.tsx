"use client";

import { useEffect, useState } from "react";
import { Badge as BadgeType, getAllBadges } from "@/lib/api/rewards";

interface BadgeCardProps {
  badge: BadgeType;
  earned?: boolean;
  progress?: number;
  earnedAt?: string;
}

export function BadgeCard({
  badge,
  earned = false,
  progress,
  earnedAt,
}: BadgeCardProps) {
  const rarityColors = {
    common: "from-[#9ECFC2] to-[#BFE3D5]",
    rare: "from-[#7CBFD0] to-[#6FCFC3]",
    epic: "from-[#548FB3] to-[#2F8F8A]",
    legendary: "from-[#26658C] to-[#3F7F6B]",
  };

  const rarityCardBackgrounds = {
    common: "from-[#BFE3D5]/70 to-[#DDF3E6]/70",
    rare: "from-[#CFEAF0]/70 to-[#BFE3D5]/70",
    epic: "from-[#BFE3D5]/70 to-[#9ECFC2]/70",
    legendary: "from-[#9ECFC2]/70 to-[#78B6A8]/70",
  };

  const rarityBorders = {
    common: "border-[#A3C6BE]/60",
    rare: "border-[#7CBFD0]/50",
    epic: "border-[#2F8F8A]/50",
    legendary: "border-[#26658C]/50",
  };

  const rarityGlow = {
    common: "shadow-[#A3C6BE]/40",
    rare: "shadow-[#7CBFD0]/40",
    epic: "shadow-[#2F8F8A]/40",
    legendary: "shadow-[#26658C]/40",
  };

  return (
    <div
      className={`
        relative p-4 rounded-2xl border-2 transition-all bg-gradient-to-br
        ${earned ? rarityCardBackgrounds[badge.rarity] : "from-[#DDF3E6]/60 to-[#CFEAF0]/60"}
        ${earned ? rarityBorders[badge.rarity] : "border-[#A3C6BE]/40"}
        ${earned ? "shadow-lg " + rarityGlow[badge.rarity] : "shadow-sm"}
        ${!earned ? "opacity-70 grayscale" : ""}
        hover:scale-105
      `}
    >
      {/* Badge Icon */}
      <div className="flex justify-center mb-3">
        <div
          className={`
            w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-inner
            ${earned ? `bg-gradient-to-br ${rarityColors[badge.rarity]}` : "bg-[#A3C6BE]/60"}
          `}
        >
          {badge.icon}
        </div>
      </div>

      {/* Badge Name */}
      <h3 className="text-center font-semibold text-[#0F2A33] mb-1">
        {badge.name}
      </h3>

      {/* Badge Description */}
      <p className="text-xs text-center text-[#355E6B] mb-2 line-clamp-2">
        {badge.description}
      </p>

      {/* Badge Details */}
      <div className="flex items-center justify-between text-xs text-[#7A9DA8] mb-2">
        <span className="capitalize">{badge.rarity}</span>
        <span>{badge.pointsAwarded} pts</span>
      </div>

      {/* Progress Bar (if not earned) */}
      {!earned && progress !== undefined && (
        <div className="mt-2">
          <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full bg-gradient-to-r ${rarityColors[badge.rarity]} transition-all`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-center text-[#7A9DA8] mt-1">
            {Math.round(progress)}% complete
          </p>
        </div>
      )}

      {/* Earned Date */}
      {earned && earnedAt && (
        <p className="text-xs text-center text-[#7A9DA8] mt-2">
          Earned {new Date(earnedAt).toLocaleDateString()}
        </p>
      )}

      {/* Locked Overlay */}
      {!earned && (
        <div className="absolute top-2 right-2">
          <svg
            className="w-5 h-5 text-[#7A9DA8]"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

export function BadgesGrid({ userId: _userId }: { userId?: string }) {
  const [badges, setBadges] = useState<BadgeType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllBadges()
      .then((response) => {
        setBadges(response.data.badges);
      })
      .catch((err) => console.error("Failed to fetch badges:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-64 bg-gradient-to-br from-[#BFE3D5]/70 to-[#DDF3E6]/70 animate-pulse rounded-2xl border border-white/30"
          />
        ))}
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="text-center py-12 text-[#7A9DA8]">
        No badges available yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {badges.map((badge) => (
        <BadgeCard key={badge.id} badge={badge} />
      ))}
    </div>
  );
}
