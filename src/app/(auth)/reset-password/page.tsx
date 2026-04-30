"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import AuthRightPanel from "@/components/auth/AuthRightPanel";
import { Logo } from "@/components/Logo";
import { useMutation } from "@tanstack/react-query";
import { axiosSecure } from "@/lib/api-client-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const resetMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await axiosSecure.post("/api/auth/reset-password", payload);
      return response.data;
    },
    onSuccess: () => {
      setDone(true);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || "Reset failed. The link may have expired.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return;
    setError("");
    resetMutation.mutate({ token, password });
  };

  const loading = resetMutation.isPending;

  return (
    <div className="min-h-screen w-full flex">
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative flex flex-col justify-center w-full lg:w-[480px] xl:w-[520px] flex-shrink-0 bg-white px-10 sm:px-16 py-12 z-10"
      >
        <div className="mb-10">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
            <Logo size={48} />
          </Link>
        </div>

        {done ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center sm:text-left"
          >
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-6 mx-auto sm:mx-0">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-gray-900 mb-2">Password reset</h1>
            <p className="text-sm text-gray-500 mb-8">
              Your password has been successfully updated. You can now sign in with your new credentials.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-semibold text-sm shadow-md shadow-purple-500/25 transition-all"
            >
              Sign in <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        ) : (
          <>
            <h1 className="font-heading text-3xl font-bold text-gray-900 mb-1">Set new password</h1>
            <p className="text-sm text-gray-500 mb-8">Choose a strong password for your account.</p>

            {!token && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                Invalid or missing reset link. Please{" "}
                <Link href="/forgot-password" className="font-semibold underline">
                  request a new one
                </Link>
                .
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-100 rounded-2xl px-5 py-3.5 pr-12 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 transition-all"
                  placeholder="New password (min 6 characters)"
                  disabled={!token}
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
                  className={`w-full bg-slate-100 rounded-2xl px-5 py-3.5 pr-12 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    confirmPassword && confirmPassword !== password
                      ? "focus:ring-red-400/60 ring-2 ring-red-300"
                      : "focus:ring-purple-400/60"
                  }`}
                  placeholder="Confirm new password"
                  disabled={!token}
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
                disabled={loading || !token}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-purple-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Update password <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </>
        )}

        <div className="mt-8">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to sign in
          </Link>
        </div>
      </motion.div>

      <AuthRightPanel />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
