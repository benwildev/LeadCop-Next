import React, { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Navbar, Footer } from "@/components/Layout";
import {
  Shield, ShieldAlert, ShieldCheck, Loader2, ArrowRight,
  CheckCircle2, XCircle, AlertTriangle, Mail, Zap, Lock,
  Server, AtSign, Inbox, Ban, Star, Globe, AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

type SignalState = "pass" | "fail" | "warn" | "unknown";

interface Signal {
  icon: React.ElementType;
  label: string;
  state: SignalState;
  detail: string;
}

function getSignals(r: FreeVerifyResult): Signal[] {
  const s = (v: boolean | null | undefined, invert = false): SignalState => {
    if (v === null || v === undefined) return "unknown";
    const ok = invert ? !v : v;
    return ok ? "pass" : "fail";
  };
  return [
    {
      icon: AtSign,
      label: "Syntax",
      state: s(r.isValidSyntax),
      detail: r.isValidSyntax ? "Valid format" : "Malformed address",
    },
    {
      icon: Server,
      label: "MX Records",
      state: s(r.mxValid),
      detail: r.mxValid ? r.mxRecords[0] || "Found" : "No records",
    },
    {
      icon: Zap,
      label: "SMTP",
      state: r.canConnectSmtp === null ? "unknown" : s(r.canConnectSmtp),
      detail: r.canConnectSmtp === true ? "Reachable" : r.canConnectSmtp === false ? "Unreachable" : "Not tested",
    },
    {
      icon: Inbox,
      label: "Deliverable",
      state: r.isDeliverable === null ? "unknown" : s(r.isDeliverable),
      detail: r.isDeliverable === true ? "Mailbox exists" : r.isDeliverable === false ? "Mailbox not found" : "Not verified",
    },
    {
      icon: Ban,
      label: "Disposable",
      state: r.isDisposable ? "fail" : "pass",
      detail: r.isDisposable ? "Throwaway domain" : "Permanent domain",
    },
    {
      icon: Globe,
      label: "Free Provider",
      state: r.isFreeEmail ? "warn" : "pass",
      detail: r.isFreeEmail ? "Consumer email" : "Custom domain",
    },
    {
      icon: AlertCircle,
      label: "Role Account",
      state: r.isRoleAccount ? "warn" : "pass",
      detail: r.isRoleAccount ? "Shared inbox" : "Personal address",
    },
    {
      icon: Lock,
      label: "Catch-all",
      state: r.isCatchAll === null ? "unknown" : r.isCatchAll ? "warn" : "pass",
      detail: r.isCatchAll === true ? "Accepts all mail" : r.isCatchAll === false ? "Not catch-all" : "Unknown",
    },
    {
      icon: Inbox,
      label: "Inbox Full",
      state: r.hasInboxFull === null ? "unknown" : r.hasInboxFull ? "fail" : "pass",
      detail: r.hasInboxFull === true ? "Inbox is full" : r.hasInboxFull === false ? "Inbox available" : "Unknown",
    },
  ];
}

const STATE_STYLE: Record<SignalState, { dot: string; icon: string; bg: string; border: string }> = {
  pass:    { dot: "bg-green-500",  icon: "text-green-500",  bg: "bg-green-500/5",    border: "border-green-500/20" },
  fail:    { dot: "bg-red-500",    icon: "text-red-400",    bg: "bg-red-500/5",      border: "border-red-500/20" },
  warn:    { dot: "bg-yellow-400", icon: "text-yellow-400", bg: "bg-yellow-400/5",   border: "border-yellow-400/20" },
  unknown: { dot: "bg-muted",      icon: "text-muted-foreground", bg: "bg-muted/20", border: "border-border" },
};

function SignalCard({ signal, index }: { signal: Signal; index: number }) {
  const s = STATE_STYLE[signal.state];
  const Icon = signal.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index }}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${s.bg} ${s.border}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${s.icon}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">{signal.label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{signal.detail}</p>
      </div>
      <div className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
    </motion.div>
  );
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

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-2xl">

          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 mb-5">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Free Email Checker</span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl mb-3">
              Verify Any Email Instantly
            </h1>
            <p className="text-muted-foreground text-base max-w-md mx-auto">
              Real-time disposable detection, SMTP validation, and deliverability checks. No account needed.
            </p>
          </motion.div>

          {/* Usage Bar */}
          <AnimatePresence>
            {statusLoaded && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
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

          {/* Search Form */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
            {limitReached ? (
              <div className="glass-card rounded-2xl p-8 text-center">
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <ShieldAlert className="h-7 w-7 text-primary" />
                </div>
                <h2 className="font-heading text-lg font-semibold text-foreground mb-2">Free Checks Exhausted</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  You've used all {limit} free checks. Create a free account to get more — no credit card required.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                    Create Free Account <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                    View Plans
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                    placeholder="Enter an email address…"
                    className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-sm"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleVerify}
                  disabled={loading || !email.trim()}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-primary/20"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
                </button>
              </div>
            )}
            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
          </motion.div>

          {/* Result */}
          <AnimatePresence>
            {result && !limitReached && (() => {
              const safe = !result.isDisposable && result.isDeliverable !== false;
              const signals = getSignals(result);
              const verdictColor = result.isDisposable
                ? { bar: "bg-red-500", glow: "shadow-red-500/10", badge: "bg-red-500/15 text-red-400 border-red-500/25" }
                : safe
                ? { bar: "bg-green-500", glow: "shadow-green-500/10", badge: "bg-green-500/15 text-green-500 border-green-500/25" }
                : { bar: "bg-yellow-400", glow: "shadow-yellow-400/10", badge: "bg-yellow-400/15 text-yellow-500 border-yellow-400/25" };
              const verdictLabel = result.isDisposable ? "Disposable" : safe ? "Deliverable" : "Unverified";
              return (
                <motion.div key={result.email} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-6">

                  {/* Verdict Banner */}
                  <div className={`glass-card rounded-2xl overflow-hidden shadow-lg ${verdictColor.glow} mb-4`}>
                    <div className={`h-1 w-full ${verdictColor.bar}`} />
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-sm font-semibold text-foreground truncate">{result.email}</span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${verdictColor.badge}`}>
                            {verdictLabel}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {result.isDisposable
                            ? "Throwaway address detected — high risk for deliverability and engagement."
                            : safe
                            ? "Address appears real and reachable. Safe to use for outreach."
                            : "Could not fully verify this address. Proceed with caution."}
                        </p>
                        {result.mxRecords.length > 0 && (
                          <p className="text-[10px] text-muted-foreground/60 font-mono mt-1.5">
                            {result.domain} · {result.mxRecords[0]}
                          </p>
                        )}
                    </div>
                  </div>

                  {/* Signal Grid */}
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">Signal Scan</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {signals.map((sig, i) => <SignalCard key={sig.label} signal={sig} index={i} />)}
                    </div>
                  </div>

                  {/* Tags */}
                  {result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {result.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold uppercase tracking-wider">
                          {tag.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* Stats row */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: ShieldCheck, label: "100K+ domains", desc: "Global database" },
              { icon: Zap,         label: "Real-time",    desc: "Instant results" },
              { icon: Shield,      label: "No account",   desc: "Try it free" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="glass-card rounded-xl p-4 text-center">
                <Icon className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center">
            <p className="text-sm text-muted-foreground mb-3">Need bulk checks or API access?</p>
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-primary/10 text-primary px-5 py-2.5 text-sm font-semibold hover:bg-primary/20 transition-colors">
              Get a Free API Key <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
