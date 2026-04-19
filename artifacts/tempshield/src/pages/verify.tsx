import React, { useState, useEffect, useCallback } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Link } from "wouter";
import { Navbar, Footer } from "@/components/Layout";
import {
  Shield, ShieldAlert, ShieldCheck, Loader2, ArrowRight,
  CheckCircle2, XCircle, AlertTriangle, Mail, Zap, Lock,
  Server, AtSign, Inbox, Ban, Star, Globe, AlertCircle,
  Upload, FileSpreadsheet, Download, Users, TrendingUp, ListChecks,
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

const BULK_BENEFITS = [
  {
    icon: Upload,
    title: "Upload Any CSV",
    desc: "Drag and drop your list. We handle the rest.",
  },
  {
    icon: ShieldCheck,
    title: "Verify Thousands Instantly",
    desc: "Disposable, invalid, and risky emails flagged automatically.",
  },
  {
    icon: Download,
    title: "Download Your Clean List",
    desc: "Get a verified CSV back — ready to import anywhere.",
  },
  {
    icon: TrendingUp,
    title: "Boost Deliverability",
    desc: "Higher open rates, lower bounce rates, better ROI.",
  },
];

const FAKE_CSV_ROWS = [
  { email: "john.smith@company.com",   status: "valid",      color: "text-green-500" },
  { email: "newsletter@mailinator.com", status: "disposable", color: "text-red-400" },
  { email: "info@tempmail.org",         status: "disposable", color: "text-red-400" },
  { email: "sarah@realco.io",           status: "valid",      color: "text-green-500" },
  { email: "noreply@guerrillamail.com", status: "disposable", color: "text-red-400" },
  { email: "mike@outlook.com",          status: "valid",      color: "text-green-500" },
];

function BulkPreviewMockup() {
  const [visibleRows, setVisibleRows] = useState(0);

  useEffect(() => {
    setVisibleRows(0);
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      setVisibleRows(n);
      if (n >= FAKE_CSV_ROWS.length) clearInterval(t);
    }, 420);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/50">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-400/70" />
          <div className="w-2 h-2 rounded-full bg-yellow-400/70" />
          <div className="w-2 h-2 rounded-full bg-green-400/70" />
        </div>
        <div className="flex-1 mx-3 rounded bg-background/60 px-3 py-1 text-[10px] text-muted-foreground font-mono truncate">
          my-leads-q1.csv — verifying…
        </div>
        <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded px-2 py-0.5">
          {visibleRows}/{FAKE_CSV_ROWS.length}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-2 gap-3 px-4 py-2 bg-muted/30 border-b border-border/30">
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Email</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Status</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/20">
        {FAKE_CSV_ROWS.map((row, i) => (
          <AnimatePresence key={row.email}>
            {i < visibleRows && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="grid grid-cols-2 gap-3 px-4 py-2.5 items-center"
              >
                <span className="font-mono text-[10px] text-foreground/80 truncate">{row.email}</span>
                <span className={`text-[10px] font-semibold ${row.color}`}>
                  {row.status}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>

      {/* Footer summary */}
      {visibleRows >= FAKE_CSV_ROWS.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 py-3 border-t border-border/40 bg-muted/20 flex items-center justify-between"
        >
          <span className="text-[10px] text-muted-foreground">
            <span className="font-semibold text-green-500">3 valid</span> · <span className="font-semibold text-red-400">3 removed</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-1">
            <Download className="h-3 w-3" />
            Download clean list
          </span>
        </motion.div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FreeVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [prewarmedEmail, setPrewarmedEmail] = useState("");

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

  useEffect(() => {
    const trimmed = email.trim();
    if (!trimmed.includes("@") || !trimmed.includes(".") || hasChecked || trimmed === prewarmedEmail || limitReached) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setPrewarmedEmail(trimmed);
      fetch("/api/verify/prewarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      }).catch(() => {});
    }, 800); // Start pre-warming 800ms after they stop typing (usually when they go to click the captcha)

    return () => clearTimeout(timeoutId);
  }, [email, hasChecked, prewarmedEmail, limitReached]);

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

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
        body: JSON.stringify({ email: email.trim(), captchaToken }),
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
      setHasChecked(true);
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

          {/* ── Hero ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 mb-5">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Free Email Checker</span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl mb-3">
              Verify Any Email Instantly
            </h1>
            <p className="text-muted-foreground text-base max-w-md mx-auto">
              Real-time disposable detection, SMTP validation, and deliverability checks.
              Try free — then clean your entire list with bulk verification.
            </p>
          </motion.div>

          {/* ── Usage Bar ── */}
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

          {/* ── Search Form ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
            {limitReached ? (
              <div className="glass-card rounded-2xl p-8 text-center border border-primary/20">
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <FileSpreadsheet className="h-7 w-7 text-primary" />
                </div>
                <h2 className="font-heading text-xl font-bold text-foreground mb-2">
                  Ready to verify your whole list?
                </h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  You've used all {limit} free checks. Sign up free and unlock bulk verification —
                  upload a CSV and clean thousands of emails at once.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                    Start Bulk Verifying Free <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                    View Plans
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
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
                    disabled={loading || !email.trim() || !captchaToken}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-primary/20"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
                  </button>
                </div>
                
                <div className="flex justify-center sm:justify-start">
                  <ReCAPTCHA
                    sitekey="6LdlQb8sAAAAAHT_sU80INx7dXcZAAgFjFDWyhef"
                    onChange={handleCaptchaChange}
                    theme="light"
                  />
                </div>
              </div>
            )}
            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
          </motion.div>

          {/* ── Result ── */}
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

                  <div className="mb-4">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">Signal Scan</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {signals.map((sig, i) => <SignalCard key={sig.label} signal={sig} index={i} />)}
                    </div>
                  </div>

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

          {/* ── Stats row ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mb-10">
            {[
              { icon: ShieldCheck, label: "100K+ domains",  desc: "Global database" },
              { icon: Zap,         label: "Real-time",      desc: "Instant results" },
              { icon: Shield,      label: "No account",     desc: "Try it free" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="glass-card rounded-xl p-4 text-center">
                <Icon className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
              </div>
            ))}
          </motion.div>

        </div>

        {/* ── BULK VERIFIER UPSELL ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: hasChecked ? 0 : 0.2, duration: 0.5 }}
          className="mx-auto max-w-5xl"
        >
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 md:p-12">
            {/* Glow */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/15 blur-[80px]" />

            <div className="relative grid gap-12 lg:grid-cols-2 items-center">

              {/* Left: copy */}
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">Bulk Email Verification</span>
                </div>

                <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl mb-4 leading-tight">
                  Still checking one at a time?{" "}
                  <span className="text-primary">Clean your whole list in minutes.</span>
                </h2>

                <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                  Upload a CSV of any size. LeadCop verifies every address — disposable,
                  invalid, undeliverable — and hands you back a clean list ready to import
                  into your CRM or email tool.
                </p>

                <ul className="space-y-3 mb-8">
                  {BULK_BENEFITS.map((b, i) => (
                    <li key={b.title} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <b.icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{b.title}</p>
                        <p className="text-xs text-muted-foreground">{b.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:-translate-y-0.5 shadow-lg shadow-primary/20"
                  >
                    Start Bulk Verifying Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    View Pricing
                  </Link>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  No credit card required · Free plan included · Cancel anytime
                </p>
              </div>

              {/* Right: bulk preview mockup */}
              <div>
                <BulkPreviewMockup />
              </div>
            </div>
          </div>
        </motion.div>

      </main>

      <Footer />
    </div>
  );
}
