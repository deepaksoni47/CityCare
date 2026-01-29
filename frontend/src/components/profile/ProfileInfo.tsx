"use client";

import { useState } from "react";
import { safeJsonResponse } from "@/lib/safeJsonResponse";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  cityId: string;
  phone?: string;
}

interface ProfileInfoProps {
  user: User;
  onUpdate: (updatedUser: Partial<User>) => void;
}

export default function ProfileInfo({ user, onUpdate }: ProfileInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: user.name || "",
    phone: user.phone || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("citycare_token");
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");

      const response = await fetch(`${apiBaseUrl}/api/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await safeJsonResponse(response, "auth/profile");

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      onUpdate(formData);
      setSuccess("Profile updated successfully!");
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name || "",
      phone: user.phone || "",
    });
    setIsEditing(false);
    setError(null);
  };

  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    agency: "Agency",
    volunteer: "Volunteer",
    citizen: "Citizen",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-[#0F2A33]">
          Personal Information
        </h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#3F7F6B] to-[#2F8F8A] hover:from-[#235347] hover:to-[#3F7F6B] text-white rounded-2xl transition-all shadow-lg shadow-[#3F7F6B]/20 flex items-center"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit Profile
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-[#3F7F6B]/10 border border-[#3F7F6B]/30 rounded-2xl text-[#235347]">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-[#355E6B] mb-2">
            Email Address
          </label>
          <div className="px-4 py-3 bg-white/30 border border-white/20 rounded-2xl text-[#7A9DA8] shadow-inner">
            {user.email}
          </div>
          <p className="mt-1 text-xs text-[#7A9DA8]">Email cannot be changed</p>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-[#355E6B] mb-2">
            Full Name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-3 bg-white/40 border border-white/20 rounded-2xl text-[#0F2A33] focus:outline-none focus:border-[#3F7F6B] focus:ring-2 focus:ring-[#3F7F6B]/20 transition-colors shadow-inner"
              required
            />
          ) : (
            <div className="px-4 py-3 bg-white/30 border border-white/20 rounded-2xl text-[#0F2A33] shadow-inner">
              {user.name}
            </div>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-[#355E6B] mb-2">
            Phone Number
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="+1234567890"
              className="w-full px-4 py-3 bg-white/40 border border-white/20 rounded-2xl text-[#0F2A33] focus:outline-none focus:border-[#3F7F6B] focus:ring-2 focus:ring-[#3F7F6B]/20 transition-colors shadow-inner"
            />
          ) : (
            <div className="px-4 py-3 bg-white/30 border border-white/20 rounded-2xl text-[#0F2A33] shadow-inner">
              {user.phone || "Not provided"}
            </div>
          )}
        </div>

        {/* Role (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-[#355E6B] mb-2">
            Role
          </label>
          <div className="px-4 py-3 bg-white/30 border border-white/20 rounded-2xl shadow-inner">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#26658C]/15 text-[#26658C] border border-[#26658C]/30">
              {roleLabels[user.role] || user.role}
            </span>
          </div>
        </div>

        {/* City (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-[#355E6B] mb-2">
            City
          </label>
          <div className="px-4 py-3 bg-white/30 border border-white/20 rounded-2xl text-[#0F2A33] shadow-inner">
            {user.cityId}
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#3F7F6B] to-[#2F8F8A] hover:from-[#235347] hover:to-[#3F7F6B] disabled:bg-[#7A9DA8] text-white rounded-2xl transition-all font-medium shadow-lg shadow-[#3F7F6B]/20"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#548FB3] to-[#26658C] hover:from-[#26658C] hover:to-[#023859] text-white rounded-2xl transition-all font-medium shadow-lg shadow-[#26658C]/20"
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
