import React, { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Navbar, Footer } from "@/components/Layout";
import {
  Shield, ShieldAlert, ShieldCheck, Loader2, ArrowRight,
  CheckCircle2, XCircle, AlertTriangle, Mail, Zap, Database, Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReputationBadge from "@/components/ReputationBadge";

interface FreeVerifyResult {
  email: string;
  domain: string;
  isDisposable: boolean;
  reputationScore: number;
  riskLevel: string;
  tags: string[];
  isValidSyntax: boolean;
  isFreeEmail: boolean;
  isRoleAccount: boolean;
  mxValid: boolean | null;
  inboxSupport: boolean | null;
  canConnectSmtp: boolean | null;
  mxAcceptsMail: boolean | null;
  mxRecords: string[];
  isDeliverable: boolean | null;
  isCatchAll: boolean | null;
  isDisabled: boolean | null;
  hasInboxFull: boolean | null;
  used: number;
  limit: number;
  remaining: number;
  limitReached: boolean;
}

export default function VerifyPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FreeVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(5);
  const [limitReached, setLimitReached] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/verify/free/status", { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setUsed(data.used ?? 0);
        setLimit(data.limit ?? 5);
        setLimitReached(data.limitReached ?? false);
      }
    } catch {
    } finally {
      setStatusLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleVerify = async () => {
    if (!email.trim() || loading) return;
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/verify/free", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 429) {
          setLimitReached(true);
          setUsed(data.used ?? used);
          setLimit(data.limit ?? limit);
        } else {
          setError(data.error || "Verification failed. Please try again.");
        }
        return;
      }
      setResult(data);
      setUsed(data.used ?? used + 1);
      setLimit(data.limit ?? limit);
      setLimitReached(data.limitReached ?? false);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;

  const scoreColor = result ? (result.reputationScore >= 80 ? "text-green-500" : result.reputationScore >= 50 ? "text-yellow-400" : "text-red-400") : "";

  const StatusBadge = ({ value, label }: { value: boolean | null | undefined; label: string }) => (
    <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`px-2.5 py-0.5 rounded-lg font-bold text-xs ${
        value === true ? "text-green-500 bg-green-500/10" :
        value === false ? "text-red-400 bg-red-500/10" :
        "text-muted-foreground bg-muted/30"
      }`}>
        {value === true ? "true" : value === false ? "false" : "null"}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-3xl">

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 mb-5">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Free Email Checker</span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl mb-3">
              Is This Email Disposable?
            </h1>
            <p className="text-muted-foreground text-base max-w-md mx-auto">
              Instantly check any email address against our database of 100,000+ disposable domains. No account required.
            </p>
          </motion.div>

          {/* Usage Counter */}
          <AnimatePresence>
            {statusLoaded && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{used} of {limit} free checks used</span>
                  <span>{remaining} remaining</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${pct >= 80 ? "bg-red-400" : pct >= 50 ? "bg-yellow-400" : "bg-primary"}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form or Limit Wall */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card rounded-2xl p-6 mb-6"
          >
            {limitReached ? (
              <div className="text-center py-4">
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <ShieldAlert className="h-7 w-7 text-primary" />
                </div>
                <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
                  Free Checks Exhausted
                </h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  You've used all {limit} free checks for this session. Create a free account to get {limit > 10 ? "more" : "10"} API requests — no credit card required.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Create Free Account <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    View Plans
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-primary" />
                  <h2 className="font-heading text-base font-semibold text-foreground">Check an Email</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Enter any email address to instantly check if it's from a disposable provider.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                    placeholder="user@example.com"
                    className="flex-1 bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    disabled={loading}
                    autoFocus
                  />
                  <button
                    onClick={handleVerify}
                    disabled={loading || !email.trim()}
                    className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-red-400 mt-3">{error}</p>
                )}
              </>
            )}
          </motion.div>

          {/* Inline Result Card */}
          <AnimatePresence>
            {result && !limitReached && (
              <motion.div
                key={result.email}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="glass-card rounded-2xl overflow-hidden mb-6"
              >
                {/* Result Header */}
                <div className="p-6 border-b border-border bg-muted/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {result.isDisposable ? (
                        <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                          <XCircle className="h-5 w-5 text-red-400" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-heading text-lg font-bold text-foreground">
                          {result.email} {result.isDisposable ? "is disposable" : result.isDeliverable ? "is valid" : "is invalid"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {result.isDisposable
                            ? "This email address is from a disposable provider and should not be used."
                            : result.isDeliverable
                            ? "This email address can be used safely."
                            : "This email address exists but cannot receive emails."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {result.isDisposable && (
                        <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold uppercase tracking-widest border border-red-500/20">
                          Disposable
                        </span>
                      )}
                      <div className="px-4 py-1.5 rounded-xl bg-secondary border border-border flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score:</span>
                        <span className={`text-base font-bold ${scoreColor}`}>{result.reputationScore}/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Details */}
                <div className="p-6">
                  {/* Format & Type */}
                  <div className="mb-6">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Format & Type</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">Format</span>
                          <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-500 text-xs font-bold">
                            {result.isValidSyntax ? "Valid" : "Invalid"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {result.isValidSyntax
                            ? "This email address has the correct format and is not gibberish."
                            : "This email address has an invalid format."}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">Type</span>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                            result.isFreeEmail ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-500"
                          }`}>
                            {result.isFreeEmail ? "Free" : "Professional"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {result.isFreeEmail
                            ? "This email uses a free provider like Gmail or Yahoo."
                            : "The domain name isn't used for webmails or for creating temporary email addresses."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Server Status */}
                  <div className="mb-6">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Server Status</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">MX Records</span>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                            result.mxValid ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-400"
                          }`}>
                            {result.mxValid ? "Valid" : "Invalid"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {result.mxValid ? result.mxRecords.join(", ") : "No MX records found"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">SMTP Connection</span>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                            result.canConnectSmtp ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-400"
                          }`}>
                            {result.canConnectSmtp ? "Valid" : "Invalid"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {result.canConnectSmtp
                            ? "We can connect to the SMTP server."
                            : "Cannot connect to the SMTP server."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Email Status */}
                  <div className="mb-6">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Email Status</h4>
                    <div className="rounded-lg bg-muted/30 px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">Deliverable</span>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                          result.isDeliverable ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-400"
                        }`}>
                          {result.isDeliverable ? "Valid" : "Invalid"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {result.isDeliverable
                          ? "This email address exists and can receive emails."
                          : "This email address does not exist or cannot receive emails."}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Checks */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detailed Checks</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <StatusBadge value={result.isDisposable} label="is_disposable" />
                      <StatusBadge value={!result.isDisposable} label="is_not_disposable" />
                      <StatusBadge value={result.isValidSyntax} label="is_valid_syntax" />
                      <StatusBadge value={result.isRoleAccount} label="is_role_account" />
                      <StatusBadge value={result.isFreeEmail} label="is_free_email" />
                      <StatusBadge value={result.isCatchAll} label="is_catch_all" />
                      <StatusBadge value={result.isDisabled} label="is_disabled" />
                      <StatusBadge value={result.hasInboxFull} label="has_inbox_full" />
                    </div>
                  </div>

                  {/* Tags */}
                  {result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border">
                      {result.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium uppercase tracking-wide">
                          {tag.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feature Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4 text-center"
          >
            {[
              { icon: ShieldCheck, label: "100K+ domains", desc: "Global database" },
              { icon: AlertTriangle, label: "Real-time", desc: "Instant results" },
              { icon: Shield, label: "No account", desc: "Try it free" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="glass-card rounded-xl p-4">
                <Icon className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
              </div>
            ))}
          </motion.div>

          {/* CTA to sign up */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-muted-foreground mb-3">
              Need more checks or want API access?
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-primary/10 text-primary px-5 py-2.5 text-sm font-semibold hover:bg-primary/20 transition-colors"
            >
              Get a Free API Key <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
