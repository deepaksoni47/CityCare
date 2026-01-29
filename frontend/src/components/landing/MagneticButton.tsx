"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";
import Link from "next/link";

interface MagneticButtonProps {
  children: React.ReactNode;
  href: string;
  variant?: "primary" | "secondary";
}

export function MagneticButton({
  children,
  href,
  variant = "primary",
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const { clientX, clientY } = e;
    const { width, height, left, top } =
      e.currentTarget.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.15, y: middleY * 0.15 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  const isPrimary = variant === "primary";

  return (
    <motion.a
      href={href}
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 350, damping: 20, mass: 0.5 }}
      className={`
        group relative inline-flex items-center justify-center px-8 py-4 
        text-base font-semibold rounded-full overflow-hidden cursor-pointer
        transition-all duration-300
        ${
          isPrimary
            ? "bg-gradient-to-br from-[#3F7F6B] to-[#235347] hover:from-[#235347] hover:to-[#165832]"
            : "bg-gradient-to-br from-[#BFE3D5] to-[#9ECFC2] border border-[#A3C6BE]/50 hover:border-[#78B6A8]"
        }
      `}
      style={{
        boxShadow: isPrimary
          ? "0 6px 20px -4px rgba(63, 127, 107, 0.4), 0 4px 12px -2px rgba(35, 83, 71, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
          : "0 4px 16px -4px rgba(111, 163, 154, 0.3), inset 0 1px 0 rgba(255,255,255,0.5)"
      }}
    >
      {/* Hover glow effect */}
      {isPrimary && (
        <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-[#6FCFC3]/20 to-transparent" />
      )}
      <div
        className={`
          absolute inset-0 rounded-full pointer-events-none
          ${isPrimary ? "" : "bg-white/10"}
        `}
      />

      <span className={`relative z-10 flex items-center gap-2 ${isPrimary ? "text-white" : "text-[#0F2A33]"}`}>
        {children}
      </span>

      {/* Bubble Animation */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        initial={false}
        animate={{
          boxShadow: isPrimary
            ? [
                "0 0 0 0 rgba(111, 207, 195, 0)",
                "0 0 0 10px rgba(111, 207, 195, 0)",
              ]
            : [
                "0 0 0 0 rgba(63, 127, 107, 0)",
                "0 0 0 10px rgba(63, 127, 107, 0)",
              ],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    </motion.a>
  );
}
