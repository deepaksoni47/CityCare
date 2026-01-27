"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import { clearAuthTokens } from "@/lib/tokenManager";
import { useAuth } from "@/lib/hooks/useAuth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL as string;

interface Issue {
  id: string;
  cityId: string;
  zoneId?: string;
  agencyId?: string;
  title: string;
  description: string;
  category: string;
  severity: number;
  status: string;
  priority: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  reportedBy: string;
  reportedByRole?: string;
  assignedTo?: string;
  aiRiskScore?: number;
  images?: string[];
  voiceTranscript?: string;
  aiImageAnalysis?: string;
  submissionType?: string;
  estimatedCost?: number;
  estimatedDuration?: number;
  actualCost?: number;
  actualDuration?: number;
  resolutionNotes?: string;
  resolvedAt?: any;
  resolvedBy?: string;
  createdAt: any;
  updatedAt: any;
}

export default function IssueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const issueId = params?.id as string;
  const { user, loading } = useAuth();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Action states
  const [assigneeId, setAssigneeId] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      toast.error("Please log in to view issue details");
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user && issueId && !loading) {
      fetchIssueDetails();
    }
  }, [user, issueId, loading, router]);

  const fetchIssueDetails = async () => {
    setIsLoading(true);
    try {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("citycare_token")
          : null;

      if (!token) {
        clearAuthTokens();
        toast.error("Session expired. Please log in again.");
        router.push("/login");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        clearAuthTokens();
        toast.error("Session expired. Please log in again.");
        router.push("/login");
        return;
      }

      if (response.ok) {
        const result = await response.json();
        const rawIssue = result.data?.issue ?? result.data;
        setIssue({
          id: rawIssue._id || rawIssue.id,
          cityId: rawIssue.cityId,
          zoneId: rawIssue.zoneId?._id || rawIssue.zoneId,
          agencyId: rawIssue.agencyId?._id || rawIssue.agencyId,
          title: rawIssue.title,
          description: rawIssue.description,
          category: rawIssue.category,
          severity: rawIssue.severity,
          status: rawIssue.status,
          priority: rawIssue.priority,
          location: rawIssue.location,
          reportedBy: rawIssue.reportedBy?._id || rawIssue.reportedBy,
          reportedByRole: rawIssue.reportedByRole,
          assignedTo: rawIssue.assignedTo?._id || rawIssue.assignedTo,
          aiRiskScore: rawIssue.aiRiskScore,
          images: rawIssue.images || [],
          voiceTranscript: rawIssue.voiceTranscript,
          aiImageAnalysis: rawIssue.aiImageAnalysis,
          submissionType: rawIssue.submissionType,
          estimatedCost: rawIssue.estimatedCost,
          estimatedDuration: rawIssue.estimatedDuration,
          actualCost: rawIssue.actualCost,
          actualDuration: rawIssue.actualDuration,
          resolutionNotes: rawIssue.resolutionNotes,
          resolvedAt: rawIssue.resolvedAt,
          resolvedBy: rawIssue.resolvedBy?._id || rawIssue.resolvedBy,
          createdAt: rawIssue.createdAt,
          updatedAt: rawIssue.updatedAt,
        });
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to load issue");
        router.push("/issues");
      }
    } catch (error) {
      console.error("Error fetching issue:", error);
      toast.error("Network error while loading issue");
      router.push("/issues");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!resolutionNotes.trim()) {
      toast.error("Please provide resolution notes");
      return;
    }

    setIsUpdating(true);
    try {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("citycare_token")
          : null;
      if (!token) {
        clearAuthTokens();
        router.push("/login");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/issues/${issueId}/resolve`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ resolutionNotes }),
        },
      );

      if (response.status === 401) {
        clearAuthTokens();
        toast.error("Session expired. Please log in again.");
        router.push("/login");
        return;
      }

      if (response.ok) {
        toast.success("Issue resolved successfully!");
        setShowResolveModal(false);
        setResolutionNotes("");
        fetchIssueDetails();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to resolve issue");
      }
    } catch (error) {
      console.error("Error resolving issue:", error);
      toast.error("Network error while resolving issue");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssign = async () => {
    if (!assigneeId.trim()) {
      toast.error("Please enter officer/agency user ID");
      return;
    }

    setIsUpdating(true);
    try {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("citycare_token")
          : null;
      if (!token) {
        clearAuthTokens();
        router.push("/login");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/issues/${issueId}/assign`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ assignedTo: assigneeId }),
        },
      );

      if (response.status === 401) {
        clearAuthTokens();
        toast.error("Session expired. Please log in again.");
        router.push("/login");
        return;
      }

      if (response.ok) {
        toast.success("Issue assigned successfully!");
        setAssigneeId("");
        fetchIssueDetails();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to assign issue");
      }
    } catch (error) {
      console.error("Error assigning issue:", error);
      toast.error("Network error while assigning issue");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsUpdating(true);
    try {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("citycare_token")
          : null;
      if (!token) {
        clearAuthTokens();
        router.push("/login");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: deleteReason || "Removed by CityCare user",
        }),
      });

      if (response.status === 401) {
        clearAuthTokens();
        toast.error("Session expired. Please log in again.");
        router.push("/login");
        return;
      }

      if (response.ok) {
        toast.success("Issue deleted successfully");
        router.push("/issues");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete issue");
      }
    } catch (error) {
      console.error("Error deleting issue:", error);
      toast.error("Network error while deleting issue");
    } finally {
      setIsUpdating(false);
      setShowDeleteModal(false);
      setDeleteReason("");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "text-rose-400 bg-rose-950/30 border-rose-500/30";
      case "high":
        return "text-orange-400 bg-orange-950/30 border-orange-500/30";
      case "medium":
        return "text-yellow-400 bg-yellow-950/30 border-yellow-500/30";
      default:
        return "text-green-400 bg-green-950/30 border-green-500/30";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "in_progress":
        return "bg-violet-500/20 text-violet-300 border-violet-500/30";
      case "resolved":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "closed":
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp._seconds
      ? new Date(timestamp._seconds * 1000)
      : new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Permission checks based on CityCare role hierarchy
  const canResolve =
    user?.role === "manager" ||
    user?.role === "admin" ||
    user?.role === "officer" ||
    user?.role === "agency";
  const canAssign =
    user?.role === "manager" ||
    user?.role === "admin" ||
    user?.role === "agency";
  const isOwner = user?.id === issue?.reportedBy;

  // Delete permissions:
  // - Citizens can delete their own issues
  // - Officers can delete their own issues
  // - Managers and Admins can delete any issue
  const canDelete =
    user?.role === "admin" ||
    user?.role === "manager" ||
    (isOwner && ["citizen", "officer", "volunteer"].includes(user?.role || ""));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mb-4"></div>
          <p className="text-white/60">Loading issue details...</p>
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-2">Issue Not Found</h2>
          <p className="text-white/60 mb-6">
            The issue you're looking for doesn't exist or has been deleted.
          </p>
          <Link href="/issues">
            <button className="px-6 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl transition">
              Back to Issues
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050814] text-white pt-24 pb-12 px-4 md:px-6 lg:px-8">
      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[100px] opacity-50" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] opacity-30" />
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/issues"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition mb-4"
          >
            <span>←</span> Back to Issues
          </Link>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${getPriorityColor(issue.priority)}`}
                >
                  {issue.priority}
                </span>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${getStatusColor(issue.status)}`}
                >
                  {issue.status.replace("_", " ")}
                </span>
                {isOwner && (
                  <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    👤 Your Report
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {issue.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                <span>📂 {issue.category}</span>
                {issue.zoneId && <span>🏙️ Zone: {issue.zoneId}</span>}
                {issue.agencyId && <span>🏛️ Agency: {issue.agencyId}</span>}
                <span>⏰ {formatDate(issue.createdAt)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              {canDelete && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-sm transition disabled:opacity-50"
                  title={
                    user?.role === "admin" || user?.role === "manager"
                      ? "Delete issue (admin/manager privilege)"
                      : "Delete your report"
                  }
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
              <h2 className="text-xl font-semibold mb-4">Description</h2>
              <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                {issue.description}
              </p>
            </motion.div>

            {/* AI Analysis */}
            {issue.aiImageAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-violet-500/10 border border-violet-500/30 rounded-2xl p-6"
              >
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  🤖 AI Image Analysis
                </h2>
                <p className="text-white/80 leading-relaxed">
                  {issue.aiImageAnalysis}
                </p>
              </motion.div>
            )}

            {/* Voice Transcript */}
            {issue.voiceTranscript && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6"
              >
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  🎤 Voice Transcript
                </h2>
                <p className="text-white/80 leading-relaxed italic">
                  "{issue.voiceTranscript}"
                </p>
              </motion.div>
            )}

            {/* Images */}
            {issue.images && issue.images.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6"
              >
                <h2 className="text-xl font-semibold mb-4">
                  Images ({issue.images.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {issue.images.map((url, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.05 }}
                      className="relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-white/10 hover:border-violet-500/50 transition"
                      onClick={() => setSelectedImage(url)}
                    >
                      <img
                        src={url}
                        alt={`Issue image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Location */}
            {issue.location && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6"
              >
                <h2 className="text-xl font-semibold mb-4">Location</h2>
                <div className="space-y-2 text-white/80">
                  <p>
                    📍 Latitude: {issue.location.latitude?.toFixed(6) || "N/A"}
                  </p>
                  <p>
                    📍 Longitude:{" "}
                    {issue.location.longitude?.toFixed(6) || "N/A"}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${issue.location.latitude},${issue.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm transition"
                  >
                    Open in Google Maps →
                  </a>
                </div>
              </motion.div>
            )}

            {/* Resolution Details */}
            {issue.status === "resolved" && issue.resolutionNotes && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6"
              >
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  ✅ Resolution
                </h2>
                <p className="text-white/80 mb-4">{issue.resolutionNotes}</p>
                {issue.resolvedAt && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <span className="text-white/60 text-sm">Resolved At:</span>
                    <p className="font-semibold text-sm mt-1">
                      {formatDate(issue.resolvedAt)}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-white/60">Issue ID:</span>
                  <p className="font-mono text-xs mt-1 break-all">{issue.id}</p>
                </div>
                <div>
                  <span className="text-white/60">Severity:</span>
                  <p className="font-semibold">{issue.severity}/10</p>
                </div>
                {issue.aiRiskScore !== undefined && (
                  <div>
                    <span className="text-white/60">AI Risk Score:</span>
                    <p className="font-semibold">{issue.aiRiskScore}/100</p>
                  </div>
                )}
                {issue.reportedByRole && (
                  <div>
                    <span className="text-white/60">Reported By Role:</span>
                    <p className="font-semibold capitalize">
                      {issue.reportedByRole.replace("_", " ")}
                    </p>
                  </div>
                )}
                {issue.assignedTo && (
                  <div>
                    <span className="text-white/60">Assigned To:</span>
                    <p className="font-mono text-xs mt-1 break-all">
                      {issue.assignedTo}
                    </p>
                  </div>
                )}
                {issue.submissionType && (
                  <div>
                    <span className="text-white/60">Submission Type:</span>
                    <p className="font-semibold capitalize">
                      {issue.submissionType}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-white/60">Last Updated:</span>
                  <p className="text-xs mt-1">{formatDate(issue.updatedAt)}</p>
                </div>
              </div>
            </motion.div>

            {/* Assign Issue */}
            {canAssign && issue.status !== "resolved" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6"
              >
                <h3 className="text-lg font-semibold mb-4">Assign Issue</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter Officer/Agency User ID"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-violet-500/50"
                  />
                  <button
                    onClick={handleAssign}
                    disabled={isUpdating || !assigneeId.trim()}
                    className="w-full px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium transition disabled:opacity-50"
                  >
                    {isUpdating ? "Assigning..." : "Assign"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Resolve Issue - Enhanced Button */}
            {canResolve &&
              issue.status !== "resolved" &&
              issue.status !== "closed" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6"
                >
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    ✅ Ready to Resolve?
                  </h3>
                  <p className="text-sm text-white/60 mb-4">
                    Mark this issue as resolved and provide resolution details
                  </p>
                  <button
                    onClick={() => setShowResolveModal(true)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl text-sm font-medium transition shadow-lg shadow-green-500/25"
                  >
                    Open Resolution Form
                  </button>
                </motion.div>
              )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl max-h-[90vh]"
            >
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 text-white/80 hover:text-white text-2xl"
              >
                ✕
              </button>
              <img
                src={selectedImage}
                alt="Full size"
                className="max-w-full max-h-[90vh] rounded-xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resolution Modal */}
      <AnimatePresence>
        {showResolveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isUpdating && setShowResolveModal(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full bg-[#0a0f1e] border border-green-500/30 rounded-2xl shadow-2xl"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-b border-green-500/30 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                      ✅
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Resolve Issue
                      </h3>
                      <p className="text-sm text-white/60">
                        Mark "{issue?.title}" as resolved
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => !isUpdating && setShowResolveModal(false)}
                    disabled={isUpdating}
                    className="text-white/60 hover:text-white text-2xl transition disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Resolution Notes */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Resolution Notes <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    placeholder="Describe how the issue was resolved..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={4}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 resize-none transition"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    Provide details about the solution and any actions taken
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex gap-3">
                    <div className="text-2xl">💡</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-green-300 mb-1">
                        Resolution Tips
                      </h4>
                      <ul className="text-xs text-white/70 space-y-1">
                        <li>• Describe the root cause of the issue</li>
                        <li>• List any parts replaced or repairs made</li>
                        <li>• Include preventive measures for future</li>
                        <li>
                          • Provide accurate cost and duration for analytics
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-white/10 px-6 py-4 flex gap-3 bg-black/20 rounded-b-2xl">
                <button
                  onClick={() => setShowResolveModal(false)}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleResolve();
                    setShowResolveModal(false);
                  }}
                  disabled={isUpdating || !resolutionNotes.trim()}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl text-sm font-medium transition disabled:opacity-50 disabled:from-green-600/50 disabled:to-emerald-600/50 shadow-lg shadow-green-500/25"
                >
                  {isUpdating ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Resolving...
                    </span>
                  ) : (
                    "✓ Mark as Resolved"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isUpdating && setShowDeleteModal(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-lg w-full bg-[#0a0f1e] border border-rose-500/30 rounded-2xl shadow-2xl"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-rose-600/20 to-red-600/20 border-b border-rose-500/30 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center">
                      ⚠️
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Delete Issue
                      </h3>
                      <p className="text-sm text-white/60">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => !isUpdating && setShowDeleteModal(false)}
                    disabled={isUpdating}
                    className="text-white/60 hover:text-white text-2xl transition disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Warning Box */}
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
                  <div className="flex gap-3">
                    <div className="text-2xl">🗑️</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-rose-300 mb-1">
                        You are about to delete:
                      </h4>
                      <p className="text-sm text-white/80 font-medium">
                        "{issue?.title}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Delete Reason */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Reason for Deletion{" "}
                    <span className="text-white/40">Optional</span>
                  </label>
                  <textarea
                    placeholder="Explain why you're deleting this issue..."
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 resize-none transition"
                  />
                  <p className="text-xs text-white/40 mt-1">
                    This will be recorded in the issue history
                  </p>
                </div>

                {/* Info */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                  <div className="flex gap-2 text-xs text-amber-200">
                    <span>💡</span>
                    <p>
                      The issue will be marked as closed. All data will be
                      preserved for audit purposes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-white/10 px-6 py-4 flex gap-3 bg-black/20 rounded-b-2xl">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteReason("");
                  }}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-xl text-sm font-medium transition disabled:opacity-50 disabled:from-rose-600/50 disabled:to-red-600/50 shadow-lg shadow-rose-500/25"
                >
                  {isUpdating ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </span>
                  ) : (
                    "🗑️ Delete Issue"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
