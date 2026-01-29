"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { clearAuthTokens, getValidUser } from "@/lib/tokenManager";
import { safeJsonResponse } from "@/lib/safeJsonResponse";
import {
  BadgeAlert,
  SquareArrowOutUpRight,
  MapPinCheck,
  Workflow,
} from "lucide-react";

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL)
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
};

// --- Types ---
interface Issue {
  id: string;
  title: string;
  category: string;
  severity: number;
  priority: string;
  status: string;
  buildingId?: string;
  createdAt: any;
}

interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface AIInsight {
  insights: string;
  analyzedIssues: number;
  timestamp: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: "citizen" | "volunteer" | "agency" | "admin";
  cityId: string;
}

export default function DashboardPage() {
  const router = useRouter();
  // Prevent multiple toasts
  let toastShown = false;

  // State
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentIssues, setRecentIssues] = useState<Issue[]>([]);
  const [highPriorityIssues, setHighPriorityIssues] = useState<Issue[]>([]);
  const [aiInsight, setAIInsight] = useState<AIInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        // Use centralized token validation
        const userDataRaw = getValidUser();
        // Type guard: ensure userDataRaw is UserData
        if (
          !userDataRaw ||
          typeof userDataRaw !== "object" ||
          typeof userDataRaw.id !== "string" ||
          typeof userDataRaw.name !== "string" ||
          typeof userDataRaw.email !== "string" ||
          typeof userDataRaw.role !== "string" ||
          typeof userDataRaw.cityId !== "string"
        ) {
          if (
            typeof window !== "undefined" &&
            window.location.pathname !== "/login"
          ) {
            if (!toastShown) {
              toastShown = true;
              toast.error("Please log in to access dashboard");
            }
            router.push("/login");
          }
          return;
        }
        const userData: UserData = {
          id: userDataRaw.id,
          name: userDataRaw.name,
          email: userDataRaw.email,
          role: userDataRaw.role as UserData["role"],
          cityId: userDataRaw.cityId,
        };
        setUser(userData);

        // Debug: show whether a token exists and the user's role (do not print token)
        if (typeof window !== "undefined") {
          const t = window.localStorage.getItem("citycare_token");
          console.debug(
            "Dashboard: token present=",
            !!t,
            "userRole=",
            userData.role,
          );
        }

        const isManagerOrAdmin = ["agency", "admin"].includes(userData.role);

        await Promise.all([
          // Only load global stats for Managers/Admins to avoid 403 errors
          isManagerOrAdmin ? loadStats(userData) : Promise.resolve(),
          loadRecentIssues(userData),
          loadHighPriorityIssues(userData),
          loadAIInsights(userData),
        ]);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthAndLoadData();
  }, []);

  const loadStats = async (userData: UserData) => {
    try {
      const token = window.localStorage.getItem("citycare_token");
      const response = await fetch(
        `${getApiBaseUrl()}/api/issues/stats?cityId=${userData.cityId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      // Handle invalid/expired token
      if (response.status === 401) {
        clearAuthTokens();
        toast.error("Session expired. Please log in again.");
        router.push("/login");
        return;
      }

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setStats({
            total: result.data.total || 0,
            open: result.data.open || 0,
            inProgress: result.data.inProgress || 0,
            resolved: result.data.resolved || 0,
            closed: result.data.closed || 0,
            critical: result.data.bySeverity?.critical || 0,
            high: result.data.bySeverity?.high || 0,
            medium: result.data.bySeverity?.medium || 0,
            low: result.data.bySeverity?.low || 0,
          });
        }
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadRecentIssues = async (userData: UserData) => {
    try {
      const token = window.localStorage.getItem("citycare_token");

      // Filter logic: Citizens see only their issues, Agencies/Admins see all
      let query = `cityId=${userData.cityId}&limit=5`;

      if (userData.role === "citizen") {
        query += `&reportedBy=${userData.id}`;
      }

      const response = await fetch(`${getApiBaseUrl()}/api/issues?${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        console.warn("Dashboard: received 401 when fetching recent issues");
        clearAuthTokens();
        toast.error("Session expired — please sign in again");
        router.push("/login");
        return;
      }

      if (response.ok) {
        const result = await safeJsonResponse(response, "dashboard/issues");
        if (result.success && result.data) {
          // Verify data structure (some backends return array directly, some inside .issues)
          const issuesData = Array.isArray(result.data)
            ? result.data
            : result.data.issues;
          // Ensure each issue has an id field (map _id to id if needed)
          const mappedIssues = (issuesData || []).map((issue: any) => ({
            ...issue,
            id: issue.id || issue._id,
          }));
          setRecentIssues(mappedIssues);
        }
      }
    } catch (error) {
      console.error("Error loading recent issues:", error);
    }
  };

  const loadHighPriorityIssues = async (userData: UserData) => {
    try {
      const token = window.localStorage.getItem("citycare_token");
      const response = await fetch(
        `${getApiBaseUrl()}/api/issues/priorities?cityId=${userData.cityId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.status === 401) {
        console.warn("Dashboard: received 401 when fetching priority issues");
        clearAuthTokens();
        toast.error("Session expired — please sign in again");
        router.push("/login");
        return;
      }

      if (response.ok) {
        const result = await safeJsonResponse(response, "dashboard/priorities");
        if (result.success && result.data) {
          // Ensure each issue has an id field (map _id to id if needed)
          const issuesData = Array.isArray(result.data) ? result.data : [];
          const mappedIssues = issuesData.map((issue: any) => ({
            ...issue,
            id: issue.id || issue._id,
          }));
          setHighPriorityIssues(mappedIssues);
        }
      }
    } catch (error) {
      console.error("Error loading high priority issues:", error);
    }
  };

  const loadAIInsights = async (userData: UserData) => {
    try {
      const token = window.localStorage.getItem("citycare_token");
      const response = await fetch(`${getApiBaseUrl()}/api/ai/insights`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        console.warn("Dashboard: received 401 when fetching AI insights");
        clearAuthTokens();
        toast.error("Session expired — please sign in again");
        router.push("/login");
        return;
      }

      if (response.ok) {
        const result = await safeJsonResponse(response, "dashboard/insights");
        if (result.success && result.data) {
          setAIInsight(result.data);
        }
      }
    } catch (error) {
      console.error("Error loading AI insights:", error);
    }
  };

  // --- UI Helpers ---
  const getRoleBadgeColor = (role?: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-[#023859]/20 text-[#26658C] border-[#26658C]/50";
      case "agency":
        return "bg-[#3F7F6B]/20 text-[#3F7F6B] border-[#3F7F6B]/50";
      case "volunteer":
        return "bg-[#548FB3]/20 text-[#548FB3] border-[#548FB3]/50";
      case "citizen":
        return "bg-[#7CBFD0]/20 text-[#26658C] border-[#7CBFD0]/50";
      default:
        return "bg-[#2F8F8A]/20 text-[#2F8F8A] border-[#2F8F8A]/50";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "text-[#011C40] bg-[#26658C]/20 border-[#023859]/50";
      case "high":
        return "text-[#023859] bg-[#548FB3]/20 border-[#26658C]/50";
      case "medium":
        return "text-[#26658C] bg-[#7CBFD0]/20 border-[#548FB3]/50";
      case "low":
        return "text-[#2F8F8A] bg-[#3F7F6B]/20 border-[#3F7F6B]/50";
      default:
        return "text-[#355E6B] bg-white/30 border-white/40";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "text-[#26658C] bg-[#548FB3]/20";
      case "in_progress":
        return "text-[#2F8F8A] bg-[#3F7F6B]/20";
      case "resolved":
        return "text-[#235347] bg-[#3F7F6B]/20";
      case "closed":
        return "text-[#7A9DA8] bg-[#BFE3D5]/40";
      default:
        return "text-[#355E6B] bg-white/30";
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return "Unknown";
    }
  };

  // --- Render Loading or block unauthorized ---
  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-[#DDF3E6] to-[#CFEAF0]">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#548FB3]/20 border-t-[#548FB3] mb-4"></div>
            <p className="text-[#355E6B]">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, render nothing (prevents cached/unauthorized view)
  if (!user) {
    return null;
  }

  // Define actions based on role
  const isManager = ["admin", "facility_manager"].includes(user?.role || "");

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#DDF3E6] via-[#CFEAF0] to-[#DDF3E6] text-[#0F2A33] pb-20 lg:pb-0">
      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#3F7F6B]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-[#548FB3]/8 rounded-full blur-3xl" />
      </div>

      <main className="pt-24 pb-12 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header with Role Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              Welcome back,
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span>
                <span className="mr-3 bg-gradient-to-r from-[#26658C] to-[#3F7F6B] bg-clip-text text-transparent text-4xl md:text-5xl font-bold mb-2">
                  {user?.name || "User"}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${getRoleBadgeColor(user?.role)}`}
                >
                  {user?.role}
                </span>
              </span>
            </div>
            <p className="text-[#355E6B] text-lg font-light">
              Infrastructure Intelligence System
            </p>
          </div>
        </motion.div>

        {/* Stats Grid - Only visible to Managers/Admins */}
        {isManager && stats ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-4 md:grid-cols-4 gap-4 mb-8"
          >
            <StatCard
              label="Total Issues"
              value={stats.total}
              icon=<BadgeAlert />
              gradient="from-[#548FB3] to-[#26658C]"
            />
            <StatCard
              label="Open"
              value={stats.open}
              icon=<SquareArrowOutUpRight />
              gradient="from-[#7CBFD0] to-[#548FB3]"
            />
            <StatCard
              label="In Progress"
              value={stats.inProgress}
              icon=<Workflow />
              gradient="from-[#2F8F8A] to-[#3F7F6B]"
            />
            <StatCard
              label="Resolved"
              value={stats.resolved}
              icon=<MapPinCheck />
              gradient="from-[#3F7F6B] to-[#235347]"
            />
          </motion.div>
        ) : (
          /* Simplified Welcome Stats for Students */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] border border-white/40 shadow-lg shadow-[#3F7F6B]/10 flex items-center justify-between"
          >
            <div>
              <h3 className="text-xl font-semibold mb-1 text-[#0F2A33]">
                My Activity
              </h3>
              <p className="text-[#355E6B] text-sm font-light">
                You have reported {recentIssues.length} active issues recently.
              </p>
            </div>
            {/* <Link href="/issues">
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
                    View History
                </button>
            </Link> */}
          </motion.div>
        )}

        {/* Dynamic Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-semibold mb-4 text-[#0F2A33]">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action 1: Report (Everyone) */}
            <QuickActionCard
              title="Heatmap View"
              description="Visualize infrastructure issues on city map"
              icon="🗺️"
              href="/heatmap"
              gradient="from-[#548FB3] to-[#26658C]"
            />
            <QuickActionCard
              title="Report Issue"
              description="Report a new infrastructure issue"
              icon="📝"
              href="/report"
              gradient="from-[#3F7F6B] to-[#2F8F8A]"
            />

            {/* Action 2: Role Based */}
            {isManager ? (
              <QuickActionCard
                title="Priorities"
                description="View critical issues requiring attention"
                icon="⚡"
                href="/priorities"
                gradient="from-[#26658C] to-[#023859]"
              />
            ) : (
              <QuickActionCard
                title="My Issues"
                description="Track status of your reported issues"
                icon="📋"
                href="/issues"
                gradient="from-[#7CBFD0] to-[#548FB3]"
              />
            )}

            {/* Action 3: Leaderboard (Everyone) */}
            <QuickActionCard
              title="Leaderboard"
              description="View community rankings and achievements"
              icon="🏆"
              href="/profile?tab=leaderboard"
              gradient="from-[#2F8F8A] to-[#3F7F6B]"
            />
          </div>
        </motion.div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* High Priority Issues (Visible to everyone, but content might differ) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] border border-white/40 rounded-3xl p-6 shadow-lg shadow-[#3F7F6B]/10"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#0F2A33]">
                {isManager ? "High Priority Issues" : "Active Alerts"}
              </h2>
              <Link
                href="/priority"
                className="text-sm text-[#3F7F6B] hover:text-[#235347] transition-colors font-semibold"
              >
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {highPriorityIssues.length > 0 ? (
                highPriorityIssues
                  .slice(0, 5)
                  .map((issue) => <IssueCard key={issue.id} issue={issue} />)
              ) : (
                <p className="text-[#355E6B] text-sm py-4 text-center font-medium">
                  No high-priority alerts
                </p>
              )}
            </div>
          </motion.div>

          {/* Recent Issues */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] border border-white/40 rounded-3xl p-6 shadow-lg shadow-[#3F7F6B]/10"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#0F2A33]">
                {isManager ? "Recent Reports" : "My Recent Reports"}
              </h2>
              <Link
                href="/issues"
                className="text-sm text-[#3F7F6B] hover:text-[#235347] transition-colors font-semibold"
              >
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {recentIssues.length > 0 ? (
                recentIssues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))
              ) : (
                <p className="text-[#355E6B] text-sm py-4 text-center font-medium">
                  No recent issues
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {/* AI Insights */}
        {aiInsight && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] border border-white/40 rounded-3xl p-6 shadow-lg shadow-[#3F7F6B]/10"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3F7F6B] to-[#2F8F8A] flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-2xl">🤖</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2 text-[#0F2A33]">
                  AI Insights
                </h3>
                <p className="text-[#355E6B] text-sm leading-relaxed mb-3">
                  {aiInsight.insights}
                </p>
                <p className="text-xs text-[#7A9DA8]">
                  Analyzed {aiInsight.analyzedIssues} issues •{" "}
                  {new Date(aiInsight.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );

  // Sub-components (kept same as your original code)
  function StatCard({ label, value, icon, gradient }: any) {
    return (
      <div className="bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] border border-white/40 rounded-2xl p-4 shadow-lg shadow-[#3F7F6B]/10">
        <div className="flex items-center justify-between mb-2 gap-4">
          <span className="w-2 h-5 md:text-2xl">{icon}</span>
          <span
            className={`text-lg md:text-2xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
          >
            {value}
          </span>
        </div>
        <p className="text-xs text-[#355E6B] font-medium">{label}</p>
      </div>
    );
  }

  function QuickActionCard({ title, description, icon, href, gradient }: any) {
    return (
      <Link href={href}>
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 cursor-pointer transition-all hover:shadow-xl hover:shadow-[#3F7F6B]/20 h-full`}
        >
          <div className="text-3xl mb-3">{icon}</div>
          <h3 className="font-semibold text-white mb-1">{title}</h3>
          <p className="text-white/90 text-sm font-light">{description}</p>
        </motion.div>
      </Link>
    );
  }

  function IssueCard({ issue }: { issue: Issue }) {
    return (
      <Link href={`/issues/${issue.id}`}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="bg-white/60 hover:bg-white/80 border border-white/60 rounded-2xl p-4 transition-all cursor-pointer mb-3 shadow-sm hover:shadow-md"
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-[#0F2A33] text-sm flex-1 line-clamp-1">
              {issue.title}
            </h4>
            <span
              className={`ml-2 px-2 py-0.5 rounded-lg text-xs font-medium border ${getPriorityColor(issue.priority)}`}
            >
              {issue.priority}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#355E6B]">
            <span className="capitalize">{issue.category}</span>
            <span>•</span>
            <span
              className={`px-2 py-0.5 rounded ${getStatusColor(issue.status)}`}
            >
              {issue.status.replace("_", " ")}
            </span>
            <span>•</span>
            <span>Severity: {issue.severity}/10</span>
          </div>
          <p className="text-xs text-[#7A9DA8] mt-2">
            {formatDate(issue.createdAt)}
          </p>
        </motion.div>
      </Link>
    );
  }
}
