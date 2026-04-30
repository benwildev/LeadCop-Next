"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { motion } from "framer-motion";
import AuthRightPanel from "@/components/auth/AuthRightPanel";
import { Logo } from "@/components/Logo";
import { useMutation } from "@tanstack/react-query";
import { axiosSecure } from "@/lib/api-client-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const forgotMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await axiosSecure.post("/api/auth/forgot-password", { email });
      return response.data;
    },
    onSuccess: () => {
      setSent(true);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    forgotMutation.mutate(email);
  };

  const loading = forgotMutation.isPending;

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

        {sent ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-6">
              <MailCheck className="w-7 h-7 text-green-500" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-gray-900 mb-2">Check your inbox</h1>
            <p className="text-sm text-gray-500 mb-8">
              If <strong>{email}</strong> is registered, we've sent a reset link. It expires in 1 hour.
            </p>
            <p className="text-xs text-gray-400">
              Didn't receive it? Check your spam folder or{" "}
              <button
                onClick={() => setSent(false)}
                className="text-purple-600 hover:text-purple-700 font-medium underline"
              >
                try again
              </button>
              .
            </p>
          </motion.div>
        ) : (
          <>
            <h1 className="font-heading text-3xl font-bold text-gray-900 mb-1">Forgot password?</h1>
            <p className="text-sm text-gray-500 mb-8">
              Enter your email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-100 rounded-2xl px-5 py-3.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 transition-all"
                placeholder="you@company.com"
                autoFocus
              />

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-purple-500/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Send reset link <ArrowRight className="w-4 h-4" /></>
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
