import React from "react";
import {
  BarChart3, Activity, TrendingUp, ShieldBan, AlertTriangle, ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";
import {
  useGetUserAnalytics,
  type DashboardDataWithPlanConfig,
  type AnalyticsTopDomain,
} from "@workspace/api-client-react";

export default function AnalyticsTab({ data, usagePct }: { data: DashboardDataWithPlanConfig; usagePct: number }) {
  const plan = data.user.plan;
  const { data: analytics, isLoading } = useGetUserAnalytics({ query: { enabled: plan !== "FREE" } });

  const requestsRemaining = data.user.requestLimit - data.user.requestCount;

  const quotaGauge = (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-6">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Plan Quota</h2>
        </div>
        <span className="rounded-md bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary uppercase tracking-wide">
          {plan}
        </span>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-heading text-3xl font-bold text-foreground">{data.user.requestCount.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground">/ {data.user.requestLimit.toLocaleString()} used</span>
      </div>
      <div className="h-3 w-full rounded-full bg-border overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-700 bg-gradient-to-r ${usagePct > 90 ? "from-red-500 to-red-600" : usagePct > 70 ? "from-yellow-500 to-orange-500" : "from-indigo-500 to-purple-500"}`}
          style={{ width: `${usagePct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {requestsRemaining.toLocaleString()} requests remaining this month
      </p>
    </motion.div>
  );

  if (plan === "FREE") {
    return (
      <div className="space-y-6">
        {quotaGauge}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground">Advanced Analytics</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Unlock detailed daily breakdowns, disposable detection rates, and top blocked domain rankings. Available on PRO.
          </p>
          <Link href="/upgrade" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Upgrade to PRO <ArrowUpRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {quotaGauge}
        <div className="flex justify-center py-12"><Activity className="h-8 w-8 text-primary animate-pulse" /></div>
      </div>
    );
  }

  const isLimited = analytics?.limited === true;
  const dailyCalls = analytics?.dailyCalls ?? [];
  const disposableRate = analytics?.disposableRate ?? 0;
  const topDomains: AnalyticsTopDomain[] = analytics?.topBlockedDomains ?? [];
  const maxBarCount = topDomains.reduce((m, d) => Math.max(m, d.count), 0);

  return (
    <div className="space-y-6">
      {!isLimited && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Calls This Month", value: analytics?.monthTotal.toLocaleString() ?? "0", color: "text-primary" },
            { label: "Total Checked", value: analytics?.totalChecked?.toLocaleString() ?? "0", color: "text-foreground" },
            { label: "Disposable Detected", value: analytics?.disposableCount?.toLocaleString() ?? "0", color: "text-red-400" },
            { label: "Detection Rate", value: `${disposableRate}%`, color: disposableRate > 50 ? "text-red-400" : disposableRate > 20 ? "text-yellow-400" : "text-green-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card rounded-2xl p-5 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className={`font-heading text-2xl font-bold ${color}`}>{value}</span>
            </div>
          ))}
        </motion.div>
      )}

      {isLimited && (
        <>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Limited analytics — upgrade to PRO for full insights including disposable rate and top blocked domains.
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-4">
            {[{ label: "Calls This Month", value: analytics?.monthTotal.toLocaleString() ?? "0", color: "text-primary" }].map(({ label, value, color }) => (
              <div key={label} className="glass-card rounded-2xl p-5 flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className={`font-heading text-2xl font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </motion.div>
        </>
      )}

      {quotaGauge}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Daily API Calls — Last 30 Days</h2>
        </div>
        {dailyCalls.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
            No data yet. Make your first API call to see chart data.
          </div>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyCalls} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={val => format(parseISO(val), "MMM d")} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))", fontSize: "12px" }}
                  labelFormatter={v => format(parseISO(v), "PP")}
                />
                <Area type="monotone" dataKey="count" name="Calls" stroke="hsl(262 83% 58%)" strokeWidth={2} fillOpacity={1} fill="url(#analyticsFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {isLimited ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
          <ShieldBan className="h-8 w-8 text-primary/40" />
          <p className="text-sm font-medium text-foreground">Disposable rate &amp; top blocked domains</p>
          <p className="text-xs text-muted-foreground max-w-xs">These insights are available on the PRO plan.</p>
          <Link href="/upgrade" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
            Upgrade to PRO <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <ShieldBan className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base font-semibold text-foreground">Top Blocked Domains</h2>
            <span className="text-xs text-muted-foreground">(all time)</span>
          </div>
          {topDomains.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No disposable emails detected yet.</p>
          ) : (
            <div className="space-y-3">
              {topDomains.map((d, i) => (
                <div key={d.domain} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">#{i + 1}</span>
                  <span className="font-mono text-sm text-foreground flex-1 truncate">{d.domain}</span>
                  <div className="w-32 h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-red-500 to-red-400"
                      style={{ width: `${Math.round((d.count / maxBarCount) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-red-400 w-8 text-right shrink-0">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
