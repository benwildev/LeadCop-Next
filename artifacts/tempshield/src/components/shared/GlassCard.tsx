import React from "react";

export default function GlassCard({
  children,
  className = "",
  padding = "p-6",
  rounded = "rounded-2xl",
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  rounded?: string;
}) {
  return (
    <div className={`glass-card ${rounded} ${padding} ${className}`}>{children}</div>
  );
}
