  const getStatusColor = (s: string) => {
    switch (s?.toLowerCase()) {
      case "open":
        return "bg-blue-500/20 text-blue-300";
      case "in_progress":
        return "bg-violet-500/20 text-violet-300";
      case "resolved":
        return "bg-green-500/20 text-green-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-violet-500/30 transition-all hover:bg-white/5"
    >
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        {/* Left: Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(issue.priority)}`}
            >
              {issue.priority}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusColor(issue.status)}`}
            >
              {issue.status.replace("_", " ")}
            </span>
            <span className="text-white/40 text-xs">
              •{" "}
              {new Date(
                issue.createdAt._seconds * 1000 || issue.createdAt,
              ).toLocaleDateString()}
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
          <p className="text-white/60 text-sm line-clamp-1 mt-1">
            {issue.description}
          </p>

          <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
            <span className="flex items-center gap-1">🏢 {issue.category}</span>
            {issue.location && (
              <span className="flex items-center gap-1">
                📍 {issue.buildingId || "Campus Map"}
              </span>
            )}
            {issue.images?.length > 0 && (
              <span className="flex items-center gap-1">
                📷 {issue.images.length} Image
                {issue.images.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 md:border-l md:border-white/10 md:pl-6">
          {/* Vote Button */}
          <VoteButton
            issueId={issue.id}
            initialVoteCount={issue.voteCount || 0}
            size="sm"
            showCount={true}
          />

          <Link href={`/issues/${issue.id}`}>
            <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
              View Details
            </button>
          </Link>

          {isOwner && (
            <button
              onClick={() => onDelete(issue.id)}
              disabled={isDeleting}
              className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors disabled:opacity-50"
              title="Delete Issue"
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
