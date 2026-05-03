"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Shield, ArrowRight, Loader2, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AuthRightPanel from "@/components/auth/AuthRightPanel";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { Logo } from "@/components/Logo";
import { EmailIntelligenceInput } from "@/components/shared/EmailIntelligenceInput";

export default function RegisterPage() {
  const { register } = useAuth();
  const siteSettings = useSiteSettings();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [emailIsInvalid, setEmailIsInvalid] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailIsInvalid) return;
    if (password !== confirmPassword) return;

    setError("");
    setLoading(true);
    try {
      await register({ name, email, password });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Registration failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans selection:bg-purple-100">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full md:w-[480px] p-8 md:p-12 flex flex-col justify-center bg-white z-10"
      >
        <Link href="/" className="inline-block mb-12">
          <Logo />
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
            Create account
          </h1>
          <p className="text-gray-500 font-medium">
            Start protecting your platform from low-quality signups in minutes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-100 rounded-2xl px-5 py-3.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 transition-all"
            placeholder="Full name"
          />

          <EmailIntelligenceInput 
            value={email}
            onChange={setEmail}
            onValidationChange={(isValid: boolean) => setEmailIsInvalid(!isValid)}
            placeholder="you@company.com"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-100 rounded-2xl px-5 py-3.5 pr-12 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 transition-all"
              placeholder="Password (min 6 characters)"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full bg-slate-100 rounded-2xl px-5 py-3.5 pr-12 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${confirmPassword && confirmPassword !== password
                  ? "focus:ring-red-400/60 ring-2 ring-red-300"
                  : "focus:ring-purple-400/60"
                }`}
              placeholder="Confirm password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && confirmPassword !== password && (
            <p className="text-xs text-red-500 -mt-2">Passwords do not match</p>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || emailIsInvalid}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-purple-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Create account <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-purple-600 hover:text-purple-700 transition-colors">
            Log in
          </Link>
        </p>
      </motion.div>

      <AuthRightPanel />
    </div>
  );
}
