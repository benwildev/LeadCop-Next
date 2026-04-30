import React from "react";
import { useAdminGetStats } from "@/lib/api-client-react";
import {
  Users,
  BarChart3,
  Database,
  CreditCard,
  Zap,
  PieChart,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { SectionHeader } from "@/components/shared";
import { Loader2 } from "lucide-react";

const CHART_PLAN_HEX = { Free: "#6b7280", Basic: "#60a5fa", Pro: "#7a719d" };
const CHART_BRAND = "#7a719d";
const CHART_BRAND_LIGHT = "#9990b8";
const CHART_GREEN = "#34d399";

const customTooltipStyle: React.CSSProperties = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "11px",
  color: "hsl(var(--foreground))",
};

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  delay,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  delay?: number;
  accent?: string;
}) {
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
        ? "text-red-400"
        : "text-muted-foreground";
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingUp : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay ?? 0 }}
      className="glass-card rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden"
    >
      <div className={`absolute inset-0 opacity-5 ${accent ?? "bg-primary"}`} />
      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#7a719d18" }}>
            <Icon className="w-4 h-4" style={{ color: "#7a719d" }} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        {trendLabel && TrendIcon && (
          <span
            className={`flex items-center gap-0.5 text-[10px] font-semibold ${trendColor}`}
          >
            <TrendIcon
              className={`w-3 h-3 ${trend === "down" ? "rotate-180" : ""}`}
            />
            {trendLabel}
          </span>
        )}
      </div>
      <div className="font-heading text-3xl font-bold text-foreground relative">
        {value}
      </div>
    </motion.div>
  );
}

function ChartCard({
  title,
  icon: Icon,
  delay,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  delay?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay ?? 0 }}
      className={`glass-card rounded-xl p-5 ${className ?? ""}`}
      style={{ borderTop: "2px solid #7a719d30" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#7a719d18" }}>
          <Icon className="w-3.5 h-3.5" style={{ color: "#7a719d" }} />
        </div>
        <h3 className="font-heading text-sm font-semibold text-foreground">
          {title}
        </h3>
      </div>
      {children}
    </motion.div>
  );
}

export function OverviewSection() {
  const statsQuery = useAdminGetStats();
  const stats = statsQuery.data;

  const trend = stats?.trendData ?? [];

  const apiCallsThisWeek = trend.slice(-7).reduce((s, d) => s + d.calls, 0);
  const apiCallsPrevWeek = trend
    .slice(-14, -7)
    .reduce((s, d) => s + d.calls, 0);
  const apiTrend =
    apiCallsPrevWeek === 0
      ? ("neutral" as const)
      : apiCallsThisWeek >= apiCallsPrevWeek
        ? ("up" as const)
        : ("down" as const);
  const apiTrendPct =
    apiCallsPrevWeek === 0
      ? ""
      : `${Math.round(Math.abs((apiCallsThisWeek - apiCallsPrevWeek) / apiCallsPrevWeek) * 100)}%`;

  const newUsersThisWeek = trend.slice(-7).reduce((s, d) => s + d.users, 0);
  const newUsersPrevWeek = trend
    .slice(-14, -7)
    .reduce((s, d) => s + d.users, 0);
  const userTrend =
    newUsersPrevWeek === 0
      ? ("neutral" as const)
      : newUsersThisWeek >= newUsersPrevWeek
        ? ("up" as const)
        : ("down" as const);
  const userTrendPct =
    newUsersPrevWeek === 0
      ? ""
      : `${Math.round(Math.abs((newUsersThisWeek - newUsersPrevWeek) / newUsersPrevWeek) * 100)}%`;

  const piePlanData = stats
    ? [
        {
          name: "Free",
          value: stats.usersByPlan?.FREE || 0,
          color: CHART_PLAN_HEX.Free,
        },
        {
          name: "Basic",
          value: stats.usersByPlan?.BASIC || 0,
          color: CHART_PLAN_HEX.Basic,
        },
        {
          name: "Pro",
          value: stats.usersByPlan?.PRO || 0,
          color: CHART_PLAN_HEX.Pro,
        },
      ]
    : [];

  const trendFilled = React.useMemo(() => {
    if (!trend.length) return [];
    const last30: { month: string; calls: number; users: number }[] = [];
    const map = Object.fromEntries(trend.map((d) => [d.date, d]));
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      last30.push({
        month: label,
        calls: map[key]?.calls ?? 0,
        users: map[key]?.users ?? 0,
      });
    }
    return last30;
  }, [trend]);

  return (
    <div>
      <SectionHeader
        title="Overview"
        subtitle="Platform-wide statistics at a glance"
      />

      {statsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : stats ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Users"
              value={stats.totalUsers.toLocaleString()}
              icon={Users}
              trend={userTrend}
              trendLabel={
                userTrendPct ? `${userTrendPct} vs last week` : undefined
              }
              delay={0}
            />
            <StatCard
              label="API Calls"
              value={stats.totalApiCalls.toLocaleString()}
              icon={BarChart3}
              trend={apiTrend}
              trendLabel={
                apiTrendPct ? `${apiTrendPct} vs last week` : undefined
              }
              delay={0.06}
            />
            <StatCard
              label="Known Domains"
              value={stats.totalDomains.toLocaleString()}
              icon={Database}
              delay={0.12}
            />
            <StatCard
              label="Pending Upgrades"
              value={stats.pendingUpgradeRequests}
              icon={CreditCard}
              trend={stats.pendingUpgradeRequests > 0 ? "up" : "neutral"}
              trendLabel={
                stats.pendingUpgradeRequests > 0 ? "Needs review" : undefined
              }
              delay={0.18}
            />
          </div>

          <ChartCard title="API Calls — Last 30 Days" icon={Zap} delay={0.24}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={trendFilled}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={CHART_BRAND}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor={CHART_BRAND}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  cursor={{
                    stroke: CHART_BRAND,
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  name="API Calls"
                  stroke={CHART_BRAND}
                  strokeWidth={2}
                  fill="url(#gradCalls)"
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_BRAND }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard
              title="New Signups — Last 30 Days"
              icon={Users}
              delay={0.3}
            >
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={trendFilled}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.5}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  />
                  <Bar
                    dataKey="users"
                    name="New Users"
                    fill={CHART_GREEN}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Users by Plan" icon={PieChart} delay={0.36}>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={180}>
                  <RechartsPie>
                    <Pie
                      data={piePlanData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {piePlanData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={customTooltipStyle} />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2.5 flex-1">
                  {piePlanData.map(({ name, value, color }) => {
                    const total =
                      piePlanData.reduce((s, d) => s + d.value, 0) || 1;
                    return (
                      <div key={name} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: color }}
                        />
                        <span className="text-xs text-muted-foreground flex-1">
                          {name}
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          {value}
                        </span>
                        <span className="text-[10px] text-muted-foreground w-8 text-right">
                          {Math.round((value / total) * 100)}%
                        </span>
                      </div>
                    );
                  })}
                  <div className="mt-1 border-t border-border pt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold text-foreground">
                        {piePlanData.reduce((s, d) => s + d.value, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ChartCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
