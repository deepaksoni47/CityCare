"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// Card color/gradient/icon/badge maps (move outside component for type safety)
const cardGradients: Record<string, string> = {
  blue: "from-[#7CBFD0]/20 via-[#548FB3]/15 to-[#26658C]/10",
  emerald: "from-[#6FCFC3]/20 via-[#3F7F6B]/15 to-[#235347]/10",
  purple: "from-[#8EB6B9]/20 via-[#2F8F8A]/15 to-[#023859]/10",
};
const cardShadows: Record<string, string> = {
  blue: "shadow-[#548FB3]/20",
  emerald: "shadow-[#3F7F6B]/20",
  purple: "shadow-[#2F8F8A]/20",
};
const iconBg: Record<string, string> = {
  blue: "bg-[#548FB3]/90",
  emerald: "bg-[#3F7F6B]/90",
  purple: "bg-[#2F8F8A]/90",
};
const iconBorder: Record<string, string> = {
  blue: "border-[#548FB3]",
  emerald: "border-[#3F7F6B]",
  purple: "border-[#2F8F8A]",
};
const iconGlow: Record<string, string> = {
  blue: "shadow-[0_0_16px_0_rgba(84,143,179,0.25)]",
  emerald: "shadow-[0_0_16px_0_rgba(63,127,107,0.25)]",
  purple: "shadow-[0_0_16px_0_rgba(47,143,138,0.25)]",
};
const badgeBg: Record<string, string> = {
  blue: "bg-[#7CBFD0]/20 border-[#548FB3]/40",
  emerald: "bg-[#6FCFC3]/20 border-[#3F7F6B]/40",
  purple: "bg-[#8EB6B9]/20 border-[#2F8F8A]/40",
};
const badgeText: Record<string, string> = {
  blue: "text-[#26658C]",
  emerald: "text-[#235347]",
  purple: "text-[#023859]",
};

const roles = [
  {
    title: "Citizens",
    access: "Issue Reporting",
    description:
      "Submit text, voice, or image-based reports. Track status in real-time.",
    icon: (
      <svg
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    color: "blue",
  },
  {
    title: "Volunteers",
    access: "Resolution & Monitoring",
    description:
      "Mark issues resolved. Attach proof. Update status. Monitor patterns.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-handshake-icon lucide-handshake"
      >
        <path d="m11 17 2 2a1 1 0 1 0 3-3" />
        <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
        <path d="m21 3 1 11h-2" />
        <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
        <path d="M3 4h8" />
      </svg>
    ),
    color: "emerald",
  },
  {
    title: "Administrators",
    access: "Analytics & Prediction",
    description:
      "View trends. Access predictions. Generate reports. Manage access.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-shield-user-icon lucide-shield-user"
      >
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="M6.376 18.91a6 6 0 0 1 11.249.003" />
        <circle cx="12" cy="11" r="4" />
      </svg>
    ),
    color: "purple",
  },
];

export function TrustAccess() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-20 px-6 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(84,143,179,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(84,143,179,0.08)_1px,transparent_1px)] bg-[size:100px_100px] -z-10" />

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-7">
            <span className="text-[#0F2A33]">Who Can</span>{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#3F7F6B] via-[#2F8F8A] to-[#26658C]">Use It</span>
          </h2>
          <p className="text-lg text-[#355E6B] max-w-2xl mx-auto mb-8">
            Role-based access. Verified actions. Full audit trail.
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-4">
            {["Verified Access", "Encrypted Data", "Audit Logged"].map(
              (badge, index) => (
                <motion.div
                  key={badge}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.7, delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-2 px-5 py-2 rounded-full border border-[#548FB3]/30 bg-[#7CBFD0]/15 backdrop-blur-sm"
                  style={{ boxShadow: "0 4px 12px -2px rgba(84, 143, 179, 0.15), inset 0 1px 0 rgba(255,255,255,0.3)" }}
                >
                  <svg
                    className="w-5 h-5 text-[#26658C]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <span className="text-sm text-[#26658C] font-medium tracking-wide">
                    {badge}
                  </span>
                </motion.div>
              ),
            )}
          </div>
        </motion.div>

        {/* Roles Grid */}
        <div className="grid md:grid-cols-3 gap-10">
          {roles.map((role, index) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.9, delay: 0.2 + index * 0.18 }}
              className={`group relative`}
            >
              {/* Card */}
              <div
                className={`relative h-full p-9 rounded-3xl bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] border border-[#A3C6BE]/40 backdrop-blur-sm overflow-hidden transition-all duration-700 group-hover:scale-[1.025]`}
                style={{ boxShadow: "0 8px 32px 0 rgba(111, 163, 154, 0.2), inset 0 1px 0 rgba(255,255,255,0.5)" }}
              >
                {/* Subtle inner gradient on hover */}
                <div
                  className={`absolute inset-0 pointer-events-none transition-all duration-700 opacity-0 group-hover:opacity-100 bg-gradient-to-tr from-[#9ECFC2]/50 to-[#78B6A8]/30`}
                />

                {/* Content */}
                <div className="relative z-10 space-y-7">
                  {/* Icon */}
                  <div
                    className={`mx-auto mb-2 flex items-center justify-center w-16 h-16 rounded-2xl border-2 ${iconBorder[role.color]} ${iconGlow[role.color]} transition-all duration-700`}
                    style={{ filter: "drop-shadow(0 0 8px rgba(0,0,0,0.10))" }}
                  >
                    <div className="w-9 h-9 flex items-center justify-center text-white">
                      {role.icon}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-[#0F2A33] mb-2">
                      {role.title}
                    </h3>
                    <div
                      className={`inline-block px-4 py-1.5 rounded-full border font-semibold text-base shadow-sm ${badgeBg[role.color]}`}
                      style={{ boxShadow: "0 2px 8px 0 rgba(111, 163, 154, 0.15), inset 0 1px 0 rgba(255,255,255,0.3)" }}
                    >
                      <span
                        className={`${badgeText[role.color]} font-semibold tracking-wide`}
                      >
                        {role.access}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[#355E6B] leading-relaxed text-center">
                    {role.description}
                  </p>

                  {/* Action Link (hidden, reserved for future) */}
                </div>

                {/* Corner Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/20 to-transparent pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Security Note */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 p-8 rounded-3xl border border-[#A3C6BE]/40 bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2]"
          style={{ boxShadow: "0 8px 32px 0 rgba(111, 163, 154, 0.2), inset 0 1px 0 rgba(255,255,255,0.5)" }}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl border-2 border-[#26658C]" style={{ boxShadow: "0 4px 12px rgba(38, 101, 140, 0.2)" }}>
                <svg
                  className="w-6 h-6 text-[#26658C]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-bold text-[#0F2A33] mb-1">
                  Enterprise-Grade Security
                </h4>
                <p className="text-[#355E6B] text-sm">
                  Firebase Authentication • Role-based permissions • End-to-end
                  encryption
                </p>
              </div>
            </div>
            <a
              href="/security"
              className="px-6 py-3 rounded-full border border-[#26658C]/30 hover:border-[#26658C]/60 text-[#0F2A33] font-medium transition-all hover:bg-[#78B6A8]/30"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" }}
            >
              Security Details
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
