"use client";

import React, { useState } from "react";
import { useEmailIntelligence } from "@/hooks/useEmailIntelligence";
import { AlertCircle, CheckCircle2, Loader2, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  placeholder?: string;
  className?: string;
}

export const EmailIntelligenceInput: React.FC<Props> = ({
  value,
  onChange,
  onValidationChange,
  placeholder = "Enter your email",
  className,
}) => {
  const { data, isChecking, error } = useEmailIntelligence(value);
  const [isOverridden, setIsOverridden] = useState(false);

  // Determine if we should block or warn
  const isHighRisk = data && (data.riskLevel === "high" || data.riskLevel === "critical" || data.isDisposable);
  const isSuspicious = data && data.riskLevel === "medium";
  
  const isValid = data ? (!isHighRisk || isOverridden) : true;

  // Notify parent of validation state
  React.useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  return (
    <div className={cn("space-y-2 w-full", className)}>
      <div className="relative">
        <input
          type="email"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOverridden(false);
          }}
          placeholder={placeholder}
          className={cn(
            "w-full px-4 py-3 bg-white border rounded-xl outline-none transition-all duration-200 pr-10",
            isChecking ? "border-slate-200" :
            isHighRisk && !isOverridden ? "border-red-500 ring-4 ring-red-500/10" :
            isSuspicious ? "border-orange-400 ring-4 ring-orange-400/10" :
            data && data.isValidSyntax ? "border-emerald-500 ring-4 ring-emerald-500/10" :
            "border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isChecking ? (
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          ) : isHighRisk && !isOverridden ? (
            <ShieldAlert className="w-5 h-5 text-red-500" />
          ) : isSuspicious ? (
            <AlertCircle className="w-5 h-5 text-orange-500" />
          ) : data && data.isValidSyntax ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : null}
        </div>
      </div>

      {/* Warnings & Feedback */}
      {data && !isChecking && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          {isHighRisk && !isOverridden && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg space-y-2">
              <div className="flex gap-2 text-red-700 text-sm font-medium">
                <ShieldAlert className="w-4 h-4 mt-0.5" />
                <span>Security Block: This email provider is not allowed.</span>
              </div>
              <ul className="text-xs text-red-600/80 list-disc list-inside pl-1">
                {data.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setIsOverridden(true)}
                className="text-xs font-semibold text-red-700 hover:underline flex items-center gap-1"
              >
                I trust this email, let me use it anyway
              </button>
            </div>
          )}

          {isSuspicious && !isHighRisk && (
            <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
              <div className="flex gap-2 text-orange-700 text-sm">
                <Info className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="font-medium">Unusual email pattern detected</p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    This email looks slightly irregular. Please double check for typos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {data.didYouMean && (
            <button
              type="button"
              onClick={() => onChange(`${value.split("@")[0]}@${data.didYouMean}`)}
              className="text-xs text-purple-600 font-medium hover:underline flex items-center gap-1"
            >
              Did you mean {value.split("@")[0]}@{data.didYouMean}?
            </button>
          )}
        </div>
      )}
    </div>
  );
};
