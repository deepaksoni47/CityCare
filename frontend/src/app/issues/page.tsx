"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { clearAuthTokens } from "@/lib/tokenManager";
import { useAuth } from "@/lib/hooks/useAuth";
import { safeJsonResponse } from "@/lib/safeJsonResponse";

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL)
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
};

const CATEGORY_OPTIONS = [
  "All",
  "Roads",
  "Water",
  "Electricity",
  "Sanitation",
  "Parks",
  "Public_Health",
  "Transportation",
  "Streetlights",
  "Pollution",
  "Safety",
  "Other",
];

interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: number;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  images?: string[];
  aiRiskScore?: number;
  reportedByName?: string;
  reportedById?: string;
  zoneName?: string;
}

function mapIssue(raw: any): Issue {
  return {
    id: raw._id || raw.id,
    title: raw.title ?? "Untitled issue",
    description: raw.description ?? "",
    category: raw.category ?? "Other",
    severity: Number(raw.severity ?? 0),
    priority: (raw.priority || "low") as Issue["priority"],
    status: (raw.status || "open") as Issue["status"],
    createdAt: raw.createdAt || raw._createdAt || new Date().toISOString(),
    location: raw.location,
    images: raw.images || [],
    aiRiskScore: raw.aiRiskScore ?? 0,
    reportedByName:
      raw.reportedBy?.name || raw.reportedBy?.email || raw.reportedBy || "",
    reportedById: raw.reportedBy?._id || raw.reportedBy?.id || raw.reportedBy,
    zoneName: raw.zoneId?.name || raw.zoneId?.code,
  };
}

export default function IssuesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [minSeverity, setMinSeverity] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showMine, setShowMine] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  const fetchIssues = useCallback(
    async (mode: "reset" | "append" = "reset") => {
      if (!user) return;

      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("citycare_token")
          : null;

      if (!token) {
        clearAuthTokens();
        router.push("/login");
        return;
      }

      const nextPage = mode === "reset" ? 1 : page;
      if (mode === "reset") {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const params = new URLSearchParams({
        page: nextPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });

      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "All") params.set("category", categoryFilter);
      if (minSeverity > 0) params.set("severity", minSeverity.toString());

      try {
        const response = await fetch(
          `${getApiBaseUrl()}/api/issues?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (response.status === 401 || response.status === 403) {
          clearAuthTokens();
          toast.error("Session expired. Please log in again.");
          router.push("/login");
          return;
        }

        const result = await safeJsonResponse(response, "issues");
        const payload = result.data?.issues ?? result.data ?? [];
        const incoming = (Array.isArray(payload) ? payload : []).map(mapIssue);

        setIssues((prev) =>
          mode === "reset" ? incoming : [...prev, ...incoming],
        );

        const pagination = result.data?.pagination;
        const more = pagination
          ? pagination.page < pagination.pages
          : incoming.length === ITEMS_PER_PAGE;

        setHasMore(more);
        setPage(more ? nextPage + 1 : nextPage);
      } catch (error) {
        console.error("Error fetching issues:", error);
        toast.error("Failed to load issues");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [user, statusFilter, categoryFilter, minSeverity, page, router],
  );

  useEffect(() => {
    if (user) {
      setPage(1);
      fetchIssues("reset");
    }
  }, [user, statusFilter, categoryFilter, minSeverity, fetchIssues]);

  const handleDelete = async (issueId: string) => {
    if (
      !confirm(
        "Delete this issue? This will remove it permanently from CityCare.",
      )
    ) {
      return;
    }

    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("citycare_token")
        : null;

    if (!token) {
      clearAuthTokens();
      router.push("/login");
      return;
    }

    setIsDeleting(issueId);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/issues/${issueId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        clearAuthTokens();
        toast.error("Session expired. Please log in again.");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const error = await safeJsonResponse(response, "issues/delete");
        toast.error(error.message || "Failed to delete issue");
        return;
      }

      setIssues((prev) => prev.filter((i) => i.id !== issueId));
      toast.success("Issue deleted successfully");
    } catch (error) {
      console.error("Error deleting issue:", error);
      toast.error("Failed to delete issue");
    } finally {
      setIsDeleting(null);
    }
  };

  const visibleIssues = useMemo(() => {
    let data = [...issues];

    if (showMine && user) {
      data = data.filter((issue) => issue.reportedById === user.id);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (issue) =>
          issue.title.toLowerCase().includes(q) ||
          issue.description.toLowerCase().includes(q) ||
          issue.category.toLowerCase().includes(q),
      );
    }

    return data;
  }, [issues, showMine, user, searchQuery]);

  if (loading || (!user && isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050814] text-white">
        <div className="text-center">
          <div className="inline-block h-12 w-12 rounded-full border-b-2 border-violet-500 animate-spin mb-4" />
          <p className="text-white/60">Loading CityCare issues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050814] text-white pt-24 pb-12 px-4 md:px-6 lg:px-8">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[100px] opacity-50" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] opacity-30" />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
              CityCare Issues
            </h1>
            <p className="text-white/60 mt-1">
              Track city infrastructure reports, incidents, and service
              requests.
            </p>
          </motion.div>

          <Link href="/report">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all flex items-center gap-2"
            >
              <span>+</span> Report New Issue
            </motion.button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 flex flex-col lg:flex-row gap-4 backdrop-blur-xl"
        >
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-black/40 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-violet-500/50 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-violet-500/50 cursor-pointer"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "Public_Health" ? "Public Health" : option}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 text-sm text-white/70">
              <span className="text-white/60">Min severity</span>
              <input
                type="range"
                min={0}
                max={10}
                value={minSeverity}
                onChange={(e) => setMinSeverity(Number(e.target.value))}
                className="accent-violet-500"
              />
              <span className="w-6 text-right text-white/80">
                {minSeverity}
              </span>
            </div>

            <button
              onClick={() => setShowMine((prev) => !prev)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                showMine
                  ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                  : "bg-black/20 border-white/10 text-white/60 hover:bg-white/5"
              }`}
            >
              My reports
            </button>
          </div>
        </motion.div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {isLoading && issues.length === 0 ? (
              [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-white/5 rounded-xl animate-pulse"
                />
              ))
            ) : visibleIssues.length > 0 ? (
              visibleIssues.map((issue) => (
                <IssueListItem
                  key={issue.id}
                  issue={issue}
                  currentUserId={user?.id}
                  currentUserRole={user?.role}
                  onDelete={handleDelete}
                  isDeleting={isDeleting === issue.id}
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed"
              >
                <div className="text-4xl mb-4">📭</div>
                <h3 className="text-xl font-semibold mb-2">No issues found</h3>
                <p className="text-white/40 max-w-md mx-auto">
                  Adjust filters or search terms, or create a new CityCare
                  report.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {hasMore && visibleIssues.length > 0 && !searchQuery && (
          <div className="mt-8 text-center">
            <button
              onClick={() => fetchIssues("append")}
              disabled={isLoadingMore}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm transition-all disabled:opacity-50"
            >
              {isLoadingMore ? "Loading..." : "Load more issues"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function IssueListItem({
  issue,
  currentUserId,
  currentUserRole,
  onDelete,
  isDeleting,
}: {
  issue: Issue;
  currentUserId?: string;
  currentUserRole?: string;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const canDelete =
    issue.reportedById === currentUserId ||
    ["admin", "manager", "officer", "agency"].includes(
      (currentUserRole || "").toLowerCase(),
    );

  const getPriorityColor = (priority: Issue["priority"]) => {
    switch (priority) {
      case "critical":
        return "text-rose-300 bg-rose-950/40 border-rose-500/30";
      case "high":
        return "text-orange-300 bg-orange-950/40 border-orange-500/30";
      case "medium":
        return "text-yellow-300 bg-yellow-950/40 border-yellow-500/30";
      default:
        return "text-green-300 bg-green-950/40 border-green-500/30";
    }
  };

  const getStatusColor = (status: Issue["status"]) => {
    switch (status) {
      case "open":
        return "bg-blue-500/20 text-blue-200 border-blue-500/30";
      case "in_progress":
        return "bg-violet-500/20 text-violet-200 border-violet-500/30";
      case "resolved":
        return "bg-green-500/20 text-green-200 border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-200 border-gray-500/30";
    }
  };

  const createdDate = new Date(issue.createdAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-violet-500/30 transition-all hover:bg-white/5"
    >
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(issue.priority)}`}
            >
              {issue.priority}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(issue.status)}`}
            >
              {issue.status.replace("_", " ")}
            </span>
            <span className="text-white/40 text-xs">
              • {createdDate.toLocaleDateString()}
            </span>
          </div>

          <Link
            href={`/issues/${issue.id}`}
            className="block group-hover:text-violet-300 transition-colors"
          >
            <h3 className="text-lg font-semibold truncate pr-8">
              {issue.title}
            </h3>
          </Link>
          <p className="text-white/60 text-sm line-clamp-2 mt-1">
            {issue.description}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-white/50">
            <span className="flex items-center gap-1">🏷️ {issue.category}</span>
            {issue.zoneName && (
              <span className="flex items-center gap-1">
                🗺️ {issue.zoneName}
              </span>
            )}
            {issue.location?.address && (
              <span className="flex items-center gap-1">
                📍 {issue.location.address}
              </span>
            )}
            {issue.images && issue.images.length > 0 && (
              <span className="flex items-center gap-1">
                📷 {issue.images.length} image
                {issue.images.length > 1 ? "s" : ""}
              </span>
            )}
            {issue.reportedByName && (
              <span className="flex items-center gap-1">
                👤 {issue.reportedByName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 md:border-l md:border-white/10 md:pl-6">
          <Link href={`/issues/${issue.id}`}>
            <button className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors text-sm">
              View details
            </button>
          </Link>

          {canDelete && (
            <button
              onClick={() => onDelete(issue.id)}
              disabled={isDeleting}
              className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors disabled:opacity-50"
              title="Delete issue"
            >
              {isDeleting ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
