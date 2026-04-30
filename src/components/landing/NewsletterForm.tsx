"use client";

import React, { useState, useRef } from "react";
import { 
  Shield, RefreshCw, X, Check 
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
    if (data.isDisposable || data.disposable) return { status: "blocked", message: "Temporary email addresses are blocked." };
    if (data.isRoleAccount || data.roleAccount) return { status: "role", message: "Role-based inboxes often convert poorly." };
    
    return { status: "valid" };
  } catch (error) {
    return { status: "invalid", message: "Could not connect to the verification server." };
  }
}

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "validating">("idle");
  const [message, setMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateEmail = async (val: string) => {
    if (!val || !val.includes("@")) {
      setStatus("idle");
      return;
    }
    
    setStatus("validating");
    try {
      const result = await checkEmailApi(val);
      if (result.status !== "valid" && result.status !== "free" && result.status !== "idle") {
        setStatus("error");
        setMessage(result.message || "Invalid email address.");
      } else {
        setStatus("idle");
        setMessage("");
      }
    } catch {
      setStatus("idle");
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    
    if (status === "error") setStatus("idle");

    timerRef.current = setTimeout(() => {
      validateEmail(val);
    }, 600);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !email.includes("@")) return;

    setStatus("loading");

    try {
      const validation = await checkEmailApi(email);

      if (validation.status !== "valid" && validation.status !== "free" && validation.status !== "idle") {
        setStatus("error");
        setMessage(validation.message || "Invalid email address.");
        return;
      }

      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error || "Something went wrong.");
        return;
      }

      setStatus("success");
      setMessage(data.message || "You're on the list.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Could not connect to server.");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Check className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-slate-900">{message}</p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-3 text-xs text-slate-500 transition-colors hover:text-slate-900"
        >
          Subscribe another email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row relative">
        <div className="relative flex-1">
          <input
            type="email"
            value={email}
            onChange={(event) => handleEmailChange(event.target.value)}
            placeholder="Work email"
            required
            className={`h-12 w-full rounded-xl border bg-white px-4 text-sm text-slate-900 outline-none transition ${
              status === "error" 
                ? "border-red-500 focus:border-red-600" 
                : "border-slate-200 focus:border-slate-900"
            }`}
          />
          {status === "validating" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={status === "loading" || status === "error"}
          className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-8 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Join"}
        </button>
      </div>
      <div className="flex items-center justify-between min-h-[1.5rem]">
        {status === "error" ? (
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-red-600 animate-in fade-in slide-in-from-top-1">
            <X className="h-3.5 w-3.5" />
            {message}
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">
            <Shield className="h-3 w-3" />
            LeadCop Protected
          </p>
        )}
      </div>
    </form>
  );
}
