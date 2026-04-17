import React from "react";
import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Variant = "primary" | "ghost" | "danger" | "outline";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  ghost: "bg-primary/15 text-primary hover:bg-primary/25",
  danger: "text-muted-foreground hover:text-red-400",
  outline: "border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted",
};

export default function ActionButton({
  onClick,
  disabled = false,
  loading = false,
  icon: Icon,
  children,
  variant = "ghost",
  className = "",
  title,
}: {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  children?: React.ReactNode;
  variant?: Variant;
  className?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : Icon ? (
        <Icon className="h-3.5 w-3.5" />
      ) : null}
      {children}
    </button>
  );
}
