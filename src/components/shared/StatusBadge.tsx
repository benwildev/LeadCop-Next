import React from "react";

const VARIANT_CLASSES: Record<string, string> = {
  success: "bg-green-500/15 text-green-400",
  danger: "bg-red-500/15 text-red-400",
  warning: "bg-yellow-500/15 text-yellow-400",
  primary: "bg-primary/15 text-primary",
  blue: "bg-blue-500/15 text-blue-400",
  muted: "bg-muted text-muted-foreground",
};

type Variant = keyof typeof VARIANT_CLASSES;

export default function StatusBadge({
  label,
  variant = "muted",
  size = "sm",
  className = "",
}: {
  label: string;
  variant?: Variant;
  size?: "xs" | "sm";
  className?: string;
}) {
  const sizeClass = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";
  const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.muted;
  return (
    <span className={`inline-flex items-center rounded-md font-semibold ${sizeClass} ${variantClass} ${className}`}>
      {label}
    </span>
  );
}
