"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Shield, RefreshCw, X, AlertCircle, Sparkles, CheckCircle2, Mail
} from "lucide-react";

type ValStatus =
  | "idle"
  | "typing"
  | "checking"
  | "blocked"
  | "role"
  | "typo"
  | "invalid"
  | "valid"
  | "tld-error"
  | "free";

type ValResult = {
  status: ValStatus;
  message?: string;
  suggestion?: string;
  reason?: string;
  reasons?: string[];
};

async function checkEmailApi(email: string): Promise<ValResult> {
  const trimmed = email.trim();

  if (!trimmed) return { status: "idle" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return {
      status: "invalid",
      message: "This does not look like a valid email address.",
    };
  }

  try {
    const response = await fetch("/api/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        status: "invalid",
        message: error.error || "Invalid email address.",
      };
    }

    const data = await response.json();

    if (data.didYouMean) {
      const [localPart] = trimmed.split("@");
      const fullSuggestion = `${localPart}@${data.didYouMean}`;
      return {
        status: "typo",
        message: `Did you mean ${fullSuggestion}?`,
        suggestion: fullSuggestion,
      };
    }

    if (data.isInvalidTld) {
      return {
        status: "tld-error",
        message: "Invalid domain extension.",
        reason: "Unsupported TLD",
      };
    }

    if (data.isForwarding) {
      return {
        status: "role",
        message: "Relay emails are not ideal for signups.",
        reason: "Forwarding or relay detected",
      };
    }

    if (data.isDisposable || data.disposable) {
      return {
        status: "blocked",
        message: "Temporary email addresses are blocked",
        reason: "Disposable provider detected",
        reasons: data.reasons,
      };
    }

    if (data.isRoleAccount || data.roleAccount) {
      return {
        status: "role",
        message: "Role-based inboxes often convert poorly.",
        reason: "Role account detected",
      };
    }

    // High risk detection (Gibberish, suspicious patterns)
    if (data.riskLevel === "high" || data.riskLevel === "critical") {
      return {
        status: "blocked",
        message: "This email looks suspicious or low-quality.",
        reason: "Security risk detected",
        reasons: data.reasons,
      };
    }

    if (data.riskLevel === "medium") {
      return {
        status: "typo",
        message: "Linguistic irregularity detected.",
        reason: "Suspicious pattern",
        reasons: data.reasons,
      };
    }

    if (data.isFree) {
      return {
        status: "free",
        message: "Personal email detected.",
      };
    }

    return {
      status: "valid",
      message: "Looks good. This appears to be a real inbox.",
    };
  } catch (error) {
    console.error("Demo validation failed", error);
    return {
      status: "invalid",
      message: "Could not connect to the verification server.",
    };
  }
}

export function LiveDemoWidget() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<ValResult>({ status: "idle" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const examples = [
    { label: "Disposable", value: "user@mailinator.com" },
    { label: "Gibberish", value: "asfjsdjf@sdkfsdk.com" },
    { label: "Role", value: "admin@corporate.com" },
    { label: "Typo", value: "john@gmial.com" },
    { label: "Relay", value: "user@privaterelay.appleid.com" },
    { label: "Real", value: "sarah@acmecorp.com" },
  ];

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (value: string) => {
    setEmail(value);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (!value.trim()) {
      setResult({ status: "idle" });
      return;
    }

    setResult({ status: "typing" });
    timerRef.current = setTimeout(async () => {
      setResult({ status: "checking" });
      const apiResult = await checkEmailApi(value);
      setResult(apiResult);
    }, 500);
  };

  const stateTone: Record<
    ValStatus,
    { border: string; icon: React.ReactNode; text: string; panel?: string }
  > = {
    idle: {
      border: "border-slate-200",
      icon: <Shield className="h-5 w-5 text-slate-300" />,
      text: "Type an email to see LeadCop classify it in real time.",
    },
    typing: {
      border: "border-slate-300",
      icon: <Shield className="h-5 w-5 text-slate-400" />,
      text: "Waiting for a quick pause before checking.",
    },
    checking: {
      border: "border-slate-400",
      icon: <RefreshCw className="h-5 w-5 animate-spin text-slate-500" />,
      text: "Checking the address now.",
    },
    blocked: {
      border: "border-red-300",
      icon: <X className="h-5 w-5 text-red-500" />,
      text: result.message || "Temporary email addresses are blocked.",
      panel: "bg-red-50 text-red-700",
    },
    role: {
      border: "border-amber-300",
      icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
      text: result.message || "Role-based email detected.",
      panel: "bg-amber-50 text-amber-700",
    },
    typo: {
      border: "border-amber-300",
      icon: <Sparkles className="h-5 w-5 text-amber-500" />,
      text: result.message || "Possible typo detected.",
      panel: "bg-amber-50 text-amber-700",
    },
    invalid: {
      border: "border-red-300",
      icon: <X className="h-5 w-5 text-red-500" />,
      text: result.message || "Invalid email address.",
      panel: "bg-red-50 text-red-700",
    },
    valid: {
      border: "border-emerald-300",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      text: result.message || "Looks good.",
      panel: "bg-emerald-50 text-emerald-700",
    },
    "tld-error": {
      border: "border-amber-300",
      icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
      text: result.message || "Invalid domain extension.",
      panel: "bg-amber-50 text-amber-700",
    },
    free: {
      border: "border-sky-300",
      icon: <Mail className="h-5 w-5 text-sky-500" />,
      text: result.message || "Personal email detected.",
      panel: "bg-sky-50 text-sky-700",
    },
  };

  const tone = stateTone[result.status];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-white/90 p-6 shadow-2xl shadow-primary/10 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-brand-gradient" />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
            Live Validator
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Real-time email intelligence engine
          </p>
        </div>

        <div className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
          Sandbox
        </div>
      </div>

      {/* Input */}
      <div
        className={`group relative flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition-all duration-300 
      ${tone.border} focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20`}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="name@company.com"
          className="flex-1 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
        />

        <div className="transition-transform duration-300 group-focus-within:scale-110">
          {tone.icon}
        </div>
      </div>

      {/* Feedback Card */}
      <div
        className={`mt-4 rounded-2xl px-4 py-4 text-[14px] transition-all duration-300 
      ${result.status === "valid"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,0.1)]"
            : result.status === "blocked" || result.status === "invalid"
              ? "bg-red-50 text-red-700 border border-red-100"
              : result.status === "free"
                ? "bg-sky-50 text-sky-700 border border-sky-100"
                : "bg-slate-50 text-slate-600 border border-slate-100"
          }`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-[2px]">{tone.icon}</div>
          <div className="flex-1">
            <p className="leading-relaxed font-medium">{tone.text}</p>

            {result.status === "typo" && result.suggestion && (
              <button
                onClick={() => handleChange(result.suggestion!)}
                className="mt-2 inline-flex items-center gap-1 rounded-lg text-[12px] font-semibold text-primary hover:text-[#e65f0b] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Apply suggestion →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="mt-6 border-t border-slate-100 pt-5">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Try Examples
        </p>

        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example.value}
              onClick={() => handleChange(example.value)}
              className="rounded-full border border-transparent bg-slate-100 px-3 py-1.5 text-[12px] font-medium text-slate-600 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
