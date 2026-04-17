import React, { useState } from "react";
import {
  Key, Copy, RefreshCw, BarChart3, Activity, CheckCircle2, Zap, Code,
  Clock, AlertTriangle, ChevronDown, Webhook, ShieldBan,
} from "lucide-react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";
import { type DashboardDataWithPlanConfig } from "@workspace/api-client-react";
import ReputationBadge from "@/components/ReputationBadge";
import VerificationModal from "@/components/VerificationModal";
import { maskEmail } from "../utils";

const ONBOARDING_KEY = "ts_onboarding_done";

function GettingStartedChecklist({ apiKey, userId }: { apiKey: string; userId: number }) {
  const storageKey = `${ONBOARDING_KEY}_${userId}`;
  const initial = (() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { return {}; }
  })();

  const [steps, setSteps] = useState<Record<string, boolean>>({
    key: initial.key ?? false,
    script: initial.script ?? false,
    test: initial.test ?? false,
  });
  const [keyCopied, setKeyCopied] = useState(false);

  const mark = (id: string) => {
    setSteps((prev) => {
      const next = { ...prev, [id]: true };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const allDone = steps.key && steps.script && steps.test;
  if (allDone) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setKeyCopied(true);
    mark("key");
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const checkItems = [
    {
      id: "key",
      label: "Copy your API key",
      sublabel: "You'll need this to authenticate your requests.",
      action: (
        <button
          onClick={handleCopyKey}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors"
        >
          {keyCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {keyCopied ? "Copied!" : "Copy key"}
        </button>
      ),
    },
    {
      id: "script",
      label: "Add the script to your site",
      sublabel: "Drop one line of HTML to start blocking disposable emails.",
      action: (
        <Link
          href="/docs"
          onClick={() => mark("script")}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors"
        >
          <Code className="w-3.5 h-3.5" /> View docs
        </Link>
      ),
    },
    {
      id: "test",
      label: "Test with a real email",
      sublabel: "Verify any email address to confirm your integration is working.",
      action: (
        <Link
          href="/verify"
          onClick={() => mark("test")}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors"
        >
          <Zap className="w-3.5 h-3.5" /> Verify email
        </Link>
      ),
    },
  ];

  const doneCount = Object.values(steps).filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 lg:col-span-3"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">Getting Started</h2>
            <p className="text-xs text-muted-foreground">{doneCount} of 3 steps complete</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {checkItems.map((item) => (
            <div
              key={item.id}
              className={`w-2 h-2 rounded-full transition-colors ${steps[item.id] ? "bg-green-500" : "bg-border"}`}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {checkItems.map((item, i) => (
          <div
            key={item.id}
            className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
              steps[item.id] ? "border-green-200 bg-green-50/50" : "border-border bg-muted/20"
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
              steps[item.id] ? "bg-green-500 text-white" : "bg-muted text-muted-foreground border border-border"
            }`}>
              {steps[item.id] ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium leading-tight ${steps[item.id] ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.sublabel}</p>
            </div>
            {!steps[item.id] && item.action}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function OverviewTab({
  data, usagePct, copied, onCopy, onRegenerate, regenPending,
}: {
  data: DashboardDataWithPlanConfig;
  usagePct: number;
  copied: boolean;
  onCopy: (text: string) => void;
  onRegenerate: () => void;
  regenPending: boolean;
}) {
  const [verifyEmail, setVerifyEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEmbedScript, setShowEmbedScript] = useState(false);

  const chartData = (() => {
    const byDayMap = new Map((data.usageByDay as { date: string; count: number }[]).map((d) => [d.date, d.count]));
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: key, count: byDayMap.get(key) ?? 0 };
    });
  })();

  const handleVerify = async () => {
    if (!verifyEmail.trim()) return;
    setIsVerifying(true);
    try {
      const res = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail.trim() }),
      });
      const result = await res.json();
      setVerifyResult(result);
      setShowModal(true);
    } catch (err) {
      alert("Verification failed: " + (err instanceof Error ? err.message : "Network error"));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <VerificationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        result={verifyResult}
        email={verifyEmail}
      />

      <GettingStartedChecklist apiKey={data.user.apiKey} userId={data.user.id} />

      {/* API Key Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 lg:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Primary API Key</h2>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg border border-border bg-muted/50 px-4 py-3 font-mono text-sm text-foreground/80 flex items-center overflow-x-auto">
            {data.user.apiKey}
          </div>
          <button onClick={() => onCopy(data.user.apiKey)}
            className="p-3 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Copy">
            {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
          <button onClick={onRegenerate} disabled={regenPending}
            className="p-3 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Regenerate">
            <RefreshCw className={`h-4 w-4 ${regenPending ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Include as{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-primary text-xs">Authorization: Bearer &lt;key&gt;</code>
          {" "}in your requests.
        </p>
      </motion.div>

      {/* Quick Verify */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Quick Verify</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={verifyEmail}
            onChange={(e) => setVerifyEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            placeholder="test@example.com"
            className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
          <button
            onClick={handleVerify}
            disabled={isVerifying || !verifyEmail.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl transition-all hover:bg-primary/90 flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
          >
            {isVerifying ? <Activity className="h-4 w-4 animate-pulse" /> : "Verify"}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Perform a real-time MX and SMTP check for any email address.
        </p>
      </motion.div>

      {/* Usage Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base font-semibold text-foreground">Usage</h2>
          </div>
          <span className="rounded-md bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary uppercase tracking-wide">
            {data.user.plan}
          </span>
        </div>
        <div className="font-heading text-3xl font-bold text-foreground mb-1">
          {data.user.requestCount.toLocaleString()}
          <span className="text-base font-normal text-muted-foreground"> / {data.user.requestLimit.toLocaleString()}</span>
        </div>
        <div className="mt-4 h-2 w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
            style={{ width: `${usagePct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {(data.user.requestLimit - data.user.requestCount).toLocaleString()} requests remaining
        </p>
      </motion.div>

      {/* Stat Pills */}
      {data.counts && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-5 lg:col-span-3">
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              { label: "Named API Keys", value: data.counts.namedApiKeys, icon: Key },
              { label: "Webhooks", value: data.counts.webhooks, icon: Webhook },
              { label: "Blocklisted Domains", value: data.counts.blocklist, icon: ShieldBan },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center gap-1 px-4 py-2">
                <Icon className="h-4 w-4 text-primary mb-1" />
                <span className="font-heading text-2xl font-bold text-foreground">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-6 lg:col-span-3">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">API Calls — Last 30 Days</h2>
        </div>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={val => format(parseISO(val), "MMM d")} interval={4} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))", fontSize: "12px" }} />
              <Area type="monotone" dataKey="count" stroke="hsl(262 83% 58%)" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Embed Script Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card rounded-2xl p-6 lg:col-span-3">
        <button
          onClick={() => setShowEmbedScript(v => !v)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base font-semibold text-foreground">Embed Script</h2>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showEmbedScript ? "rotate-180" : ""}`} />
        </button>
        {showEmbedScript && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Drop this snippet into your HTML to enable client-side disposable email detection on your forms.
            </p>
            <div className="flex gap-2 items-start">
              <pre className="flex-1 rounded-xl bg-muted/50 border border-border px-4 py-3 font-mono text-xs text-foreground/80 overflow-x-auto whitespace-pre-wrap break-all">
                {`<script src="${typeof window !== "undefined" ? window.location.origin : ""}/temp-email-validator.js" data-api-key="${data.user.apiKey}"></script>`}
              </pre>
              <button
                onClick={() => onCopy(`<script src="${typeof window !== "undefined" ? window.location.origin : ""}/temp-email-validator.js" data-api-key="${data.user.apiKey}"></script>`)}
                className="flex-shrink-0 p-3 rounded-xl border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Recent Requests */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-6 lg:col-span-3 overflow-hidden">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Recent Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border">
                {["Timestamp", "Email", "Domain", "Disposable", "Score", "Endpoint"].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data.recentUsage || data.recentUsage.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No requests yet. Make your first API call!
                  </td>
                </tr>
              ) : (
                (data.recentUsage as Array<{ id: number; endpoint: string; email?: string | null; domain?: string | null; isDisposable?: boolean | null; reputationScore?: number | null; timestamp: string }>).map(entry => (
                  <tr key={entry.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 pr-4 text-foreground/70 text-xs whitespace-nowrap">{format(parseISO(entry.timestamp), "PP pp")}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-foreground/80 max-w-[160px] truncate">{entry.email ? maskEmail(entry.email) : <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{entry.domain ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-3 pr-4">
                      {entry.isDisposable == null ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : entry.isDisposable ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                          <AlertTriangle className="h-3 w-3" /> Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                          <CheckCircle2 className="h-3 w-3" /> No
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {entry.reputationScore == null ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <ReputationBadge score={entry.reputationScore} />
                      )}
                    </td>
                    <td className="py-3 font-mono text-xs text-muted-foreground">{entry.endpoint}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
