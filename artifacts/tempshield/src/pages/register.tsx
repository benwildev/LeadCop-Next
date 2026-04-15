import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Shield, ArrowRight, Loader2, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AuthRightPanel from "@/components/AuthRightPanel";
import { isValidEmail, extractDomain, KNOWN_DISPOSABLE_DOMAINS } from "@/utils/email-validation";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [emailDisposable, setEmailDisposable] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkEmail = useCallback(async (emailValue: string) => {
    if (!isValidEmail(emailValue)) {
      setEmailDisposable(null);
      return;
    }
    const domain = extractDomain(emailValue);
    if (KNOWN_DISPOSABLE_DOMAINS.has(domain)) {
      setEmailDisposable(true);
      return;
    }
    setCheckingEmail(true);
    try {
      const res = await fetch(`${window.location.origin}/api/check-email/demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
        credentials: "omit",
      });
      const data = await res.json();
      setEmailDisposable(typeof data.isDisposable === "boolean" ? data.isDisposable : false);
    } catch {
      setEmailDisposable(false);
    } finally {
      setCheckingEmail(false);
    }
  }, []);

  useEffect(() => {
    setEmailDisposable(null);
    setCheckingEmail(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (email) {
      debounceRef.current = setTimeout(() => checkEmail(email), 500);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [email, checkEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (emailDisposable) {
      setError("Disposable email addresses are not allowed. Please use a permanent email address.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await register({ name, email, password });
    } catch (err: any) {
      setError(err.error || "Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const emailIsInvalid = emailDisposable === true;

  return (
    <div className="min-h-screen w-full flex">
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative flex flex-col justify-center w-full lg:w-[480px] xl:w-[520px] flex-shrink-0 bg-white px-10 sm:px-16 py-12 z-10"
      >
        <div className="mb-10">
          <Link href="/">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30 cursor-pointer hover:opacity-90 transition-opacity">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </Link>
        </div>

        <h1 className="font-heading text-3xl font-bold text-gray-900 mb-1">Create an account</h1>
        <p className="text-sm text-gray-500 mb-8">Start protecting your platform in minutes.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-100 rounded-2xl px-5 py-3.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 transition-all"
            placeholder="Full name"
          />

          <div>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-2xl px-5 py-3.5 pr-10 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  emailIsInvalid
                    ? "bg-red-50 ring-2 ring-red-300 focus:ring-red-400/60"
                    : "bg-slate-100 focus:ring-purple-400/60"
                }`}
                placeholder="you@company.com"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {checkingEmail && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                )}
                {!checkingEmail && emailIsInvalid && (
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
            <AnimatePresence>
              {emailIsInvalid && (
                <motion.p
                  key="disposable-warn"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-1.5 text-xs text-red-500 font-medium px-1"
                >
                  Disposable email addresses are not allowed.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

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
              className={`w-full bg-slate-100 rounded-2xl px-5 py-3.5 pr-12 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                confirmPassword && confirmPassword !== password
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
            disabled={loading || emailIsInvalid || checkingEmail}
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
