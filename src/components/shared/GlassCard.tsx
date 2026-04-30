import React from "react";

const VARIANT_STYLES = {
  default: "glass-card",
  metric: "glass-card border-t-2 border-t-primary/20",
  elevated: "glass-card shadow-lg hover:shadow-xl hover:-translate-y-0.5",
  bordered: "glass-card ring-1 ring-border/50",
} as const;

export default function GlassCard({
  children,
  className = "",
  padding = "p-6",
  rounded = "rounded-2xl",
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  rounded?: string;
  variant?: keyof typeof VARIANT_STYLES;
}) {
  return (
    <div className={`${VARIANT_STYLES[variant]} ${rounded} ${padding} transition-all duration-200 ${className}`}>
      {children}
    </div>
  );
}
