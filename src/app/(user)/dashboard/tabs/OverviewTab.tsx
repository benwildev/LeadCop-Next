import React, { useState } from "react";
import {
  Key, Copy, RefreshCw, BarChart3, Activity, CheckCircle2, Zap,
  Clock, AlertTriangle, Webhook, ShieldBan, Shield, TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { type DashboardDataWithPlanConfig } from "@/lib/api-client-react";
import ReputationBadge from "@/components/shared/ReputationBadge";
import { GlassCard, ActionButton, PageHeader } from "@/components/shared";
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
  });
  const [keyCopied, setKeyCopied] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);

  const mark = (id: string) => {
    setSteps((prev) => {
      const next = { ...prev, [id]: true };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { }
      return next;
    });
  };

  const allDone = steps.key && steps.script;
  if (allDone) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setKeyCopied(true);
    mark("key");
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const handleCopyScript = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://leadcop.io";
    const scriptTag = `<script src="${origin}/temp-email-validator.js" data-api-key="${apiKey}"></script>`;
    navigator.clipboard.writeText(scriptTag);
    setScriptCopied(true);
    mark("script");
    setTimeout(() => setScriptCopied(false), 2000);
  };

  const checkItems = [
    {
      id: "key",
      label: "Copy your API key",
      sublabel: "You'll need this to authenticate your requests.",
      action: (
        <button
          onClick={handleCopyKey}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
        <button
          onClick={handleCopyScript}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          {scriptCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {scriptCopied ? "Copied!" : "Copy script"}
        </button>
      ),
    },
  ];

  const doneCount = Object.values(steps).filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 col-span-full"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">Getting Started</h2>
            <p className="text-xs text-muted-foreground">{doneCount} of 2 steps complete</p>
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
            className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${steps[item.id] ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/5" : "border-border bg-muted/20"
              }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${steps[item.id] ? "bg-green-500 text-white" : "bg-muted text-muted-foreground border border-border"
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

/* ── Circular usage gauge ── */
function UsageGauge({ pct, count, limit }: { pct: number; count: number; limit: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const gaugeColor = pct > 90 ? "stroke-red-500" : pct > 70 ? "stroke-amber-500" : "stroke-primary";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
          <circle
            cx="60" cy="60" r={radius} fill="none"
            className={`${gaugeColor} transition-all duration-1000 ease-out`}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-2xl font-bold text-foreground">
            {limit === -1 ? "∞" : `${Math.round(pct)}%`}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">used</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        {count.toLocaleString()} / {limit === -1 ? "Unlimited" : limit.toLocaleString()}
      </p>
    </div>
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
  const [scriptCopied, setScriptCopied] = useState(false);
  const scriptSnippet = `<script\n  src="${typeof window !== "undefined" ? window.location.origin : "https://leadcop.io"}/temp-email-validator.js"\n  data-api-key="${data.user.apiKey}">\n</script>`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptSnippet);
    setScriptCopied(true);
    setTimeout(() => setScriptCopied(false), 2000);
  };

  const chartData = (() => {
    const byDayMap = new Map((data.usageByDay as { date: string; count: number }[]).map((d) => [d.date, d.count]));
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: key, count: byDayMap.get(key) ?? 0 };
    });
  })();

  // Today's calls
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCalls = chartData.find(d => d.date === todayKey)?.count ?? 0;

  // 7-day total
  const last7 = chartData.slice(-7).reduce((sum, d) => sum + d.count, 0);

  const metricCards = [
    {
      label: "Credits Used",
      value: data.user.requestCount.toLocaleString(),
      sub: data.user.requestLimit === -1 ? "of Unlimited" : `of ${data.user.requestLimit.toLocaleString()}`,
      icon: Zap,
      color: "text-primary",
      bg: "bg-primary/10",
      gradient: "from-primary/5 to-transparent",
    },
    {
      label: "Today",
      value: todayCalls.toLocaleString(),
      sub: "API calls today",
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      gradient: "from-emerald-500/5 to-transparent",
    },
    {
      label: "Last 7 Days",
      value: last7.toLocaleString(),
      sub: "total calls",
      icon: Activity,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      gradient: "from-blue-500/5 to-transparent",
    },
    {
      label: "Blocked",
      value: data.counts?.blocklist?.toLocaleString() ?? "0",
      sub: "domains blocklisted",
      icon: Shield,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      gradient: "from-rose-500/5 to-transparent",
    },
  ];

  return (
    <div className="space-y-6">
      <GettingStartedChecklist apiKey={data.user.apiKey} userId={data.user.id} />

      {/* ── Metric Bento Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map(({ label, value, sub, icon: Icon, color, bg, gradient }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-2xl p-5 relative overflow-hidden group hover:shadow-md transition-shadow"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <div className="relative">
              <div className={`mb-3 h-9 w-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── API Key + Radial Usage ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* API Key */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base font-semibold text-foreground">Primary API Key</h2>
            <span className="ml-auto rounded-md bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary uppercase tracking-wide">
              {data.user.plan}
            </span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl border border-border bg-muted/40 px-4 py-3 font-mono text-sm text-foreground/80 flex items-center overflow-x-auto">
              {data.user.apiKey}
            </div>
            <button onClick={() => onCopy(data.user.apiKey)}
              className="p-3 rounded-xl border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Copy">
              {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
            <button onClick={onRegenerate} disabled={regenPending}
              className="p-3 rounded-xl border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
              title="Regenerate">
              <RefreshCw className={`h-4 w-4 ${regenPending ? "animate-spin" : ""}`} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Include as{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-primary text-xs">Authorization: Bearer &lt;key&gt;</code>
            {" "}in your requests.
          </p>

          {/* Embed Script Section */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Embed Script</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Paste this before the closing <code className="text-primary">&lt;/body&gt;</code> tag on your site.
                </p>
              </div>
              <button
                onClick={handleCopyScript}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                {scriptCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {scriptCopied ? "Copied!" : "Copy Snippet"}
              </button>
            </div>
            <pre className="rounded-xl bg-muted/40 border border-border/50 px-4 py-3 text-[11px] font-mono text-foreground/70 overflow-x-auto whitespace-pre select-all transition-colors hover:border-primary/30">
              {scriptSnippet}
            </pre>
          </div>
        </motion.div>

        {/* Radial Usage Gauge */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center">
          <h2 className="font-heading text-sm font-semibold text-muted-foreground mb-4">Monthly Usage</h2>
          <UsageGauge pct={usagePct} count={data.user.requestCount} limit={data.user.requestLimit} />
          <p className="text-xs text-muted-foreground mt-3 text-center">
            {data.user.requestLimit === -1 ? "Uncapped access enabled" : `${(data.user.requestLimit - data.user.requestCount).toLocaleString()} remaining`}
          </p>
        </motion.div>
      </div>

      {/* ── Quick Stats Bar ── */}
      {data.counts && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "API Keys", value: data.counts.namedApiKeys, icon: Key, color: "text-indigo-500", bg: "bg-indigo-500/10" },
              { label: "Webhooks", value: data.counts.webhooks, icon: Webhook, color: "text-purple-500", bg: "bg-purple-500/10" },
              { label: "Blocklist", value: data.counts.blocklist, icon: ShieldBan, color: "text-rose-500", bg: "bg-rose-500/10" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="glass-card rounded-2xl p-4 flex items-center gap-3 transition-all hover:shadow-sm">
                <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div>
                  <span className="font-heading text-xl font-bold text-foreground">{value.toLocaleString()}</span>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── API Calls Chart ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">API Calls — Last 30 Days</h2>
        </div>
        <div className="h-[280px] w-full">
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

      {/* ── Recent Requests ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card rounded-2xl p-6 overflow-hidden">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Recent Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border">
                {["Timestamp", "Email", "Domain", "Disposable", "Score", "Source", "Endpoint"].map(h => (
                  <th key={h} className="pb-3 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data.recentUsage || data.recentUsage.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No requests yet. Make your first API call!
                  </td>
                </tr>
              ) : (
                (data.recentUsage as Array<{ id: number; endpoint: string; email?: string | null; domain?: string | null; isDisposable?: boolean | null; reputationScore?: number | null; source?: string | null; timestamp: string }>).map(entry => (
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
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
                        {entry.source || "custom"}
                      </span>
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
