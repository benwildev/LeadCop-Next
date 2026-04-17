import { useAdminGetRevenue } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import {
  Loader2,
  DollarSign,
  Users,
  TrendingUp,
  PieChart,
  BarChart3,
  CreditCard,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { SectionHeader, GlassCard, EmptyState, DataTable, PageHeader, type Column } from "@/components/shared";
import { PLAN_COLORS } from "../constants";

const PLAN_BAR_COLORS: Record<string, string> = {
  FREE: "hsl(var(--muted-foreground))",
  BASIC: "hsl(214 91% 60%)",
  PRO: "hsl(262 83% 58%)",
};

type RecentSub = { id: number; userName: string; userEmail: string; plan: string; price: number; approvedAt: string | null };

const recentColumns: Column<RecentSub>[] = [
  {
    key: "user",
    label: "User",
    render: (row) => (
      <div>
        <div className="font-medium text-foreground">{row.userName}</div>
        <div className="text-xs text-muted-foreground">{row.userEmail}</div>
      </div>
    ),
  },
  {
    key: "plan",
    label: "Plan",
    render: (row) => (
      <span className={`text-xs font-bold rounded-md px-2 py-1 ${PLAN_COLORS[row.plan] || "bg-muted/60 text-muted-foreground"}`}>
        {row.plan}
      </span>
    ),
  },
  {
    key: "price",
    label: "Price / mo",
    render: (row) => (
      <span className="text-sm font-semibold text-foreground">
        ${row.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: "approvedAt",
    label: "Approved On",
    render: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.approvedAt ? format(parseISO(row.approvedAt), "PP") : "—"}
      </span>
    ),
  },
];

export function RevenueSection() {
  const revenueQuery = useAdminGetRevenue();
  const data = revenueQuery.data;

  return (
    <div>
      <SectionHeader title="Revenue" subtitle="Earnings, subscriptions, and plan breakdown" />

      {revenueQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "Monthly Recurring Revenue",
                val: `$${data.mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                icon: DollarSign,
                color: "text-green-400",
                bg: "bg-green-500/10",
              },
              {
                label: "Total Paid Users",
                val: data.totalPaidUsers,
                icon: Users,
                color: "text-blue-400",
                bg: "bg-blue-500/10",
              },
              {
                label: "Plan Revenue Breakdown",
                val:
                  data.revenueByPlan
                    .filter((r) => r.plan !== "FREE" && r.userCount > 0)
                    .map((r) => `${r.plan} $${r.revenue.toFixed(0)}`)
                    .join(" · ") || "—",
                icon: TrendingUp,
                color: "text-primary",
                bg: "bg-primary/10",
              },
            ].map(({ label, val, icon: Icon, color, bg }, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <GlassCard rounded="rounded-xl" padding="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                  </div>
                  <div className="font-heading text-2xl font-bold text-foreground">{val}</div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <GlassCard rounded="rounded-xl">
              <h3 className="font-heading text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-primary" /> Revenue by Plan
              </h3>
              <div className="space-y-3">
                {data.revenueByPlan.map((row) => {
                  const maxRevenue = Math.max(...data.revenueByPlan.map((r) => r.revenue), 1);
                  return (
                    <div key={row.plan} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground w-14 shrink-0">{row.plan}</span>
                      <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${(row.revenue / maxRevenue) * 100}%`,
                            backgroundColor: PLAN_BAR_COLORS[row.plan] || "hsl(var(--primary))",
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                        {row.userCount} user{row.userCount !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs font-semibold text-foreground w-20 text-right shrink-0">
                        ${row.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo
                      </span>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard rounded="rounded-xl">
              <h3 className="font-heading text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> New Subscriptions — Last 12 Months
              </h3>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlySubs} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                    <XAxis
                      dataKey="month"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val: string) => {
                        const [year, month] = val.split("-");
                        return new Date(Number(year), Number(month) - 1).toLocaleString("default", { month: "short" });
                      }}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        color: "hsl(var(--foreground))",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [value, "New subscriptions"]}
                      labelFormatter={(label: string) => {
                        const [year, month] = label.split("-");
                        return new Date(Number(year), Number(month) - 1).toLocaleString("default", { month: "long", year: "numeric" });
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {data.monthlySubs.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill="hsl(262 83% 58%)" fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <GlassCard rounded="rounded-xl" padding="p-0" className="overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <h3 className="font-heading text-base font-semibold text-foreground">Recent Approved Subscriptions</h3>
              </div>
              {data.recent.length === 0 ? (
                <EmptyState icon={CreditCard} title="No approved subscriptions yet." />
              ) : (
                <DataTable<RecentSub>
                  columns={recentColumns}
                  rows={data.recent as RecentSub[]}
                  emptyMessage="No approved subscriptions yet."
                />
              )}
            </GlassCard>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
