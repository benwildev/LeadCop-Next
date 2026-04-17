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
import { SectionHeader } from "@/components/shared";
import { PLAN_COLORS } from "../constants";

const PLAN_BAR_COLORS: Record<string, string> = {
  FREE: "hsl(var(--muted-foreground))",
  BASIC: "hsl(214 91% 60%)",
  PRO: "hsl(262 83% 58%)",
};

export function RevenueSection() {
  const revenueQuery = useAdminGetRevenue();
  const data = revenueQuery.data;

  return (
    <div>
      <SectionHeader
        title="Revenue"
        subtitle="Earnings, subscriptions, and plan breakdown"
      />

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
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card rounded-xl p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}
                  >
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {label}
                  </span>
                </div>
                <div className="font-heading text-2xl font-bold text-foreground">
                  {val}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-xl p-6"
          >
            <h3 className="font-heading text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" /> Revenue by Plan
            </h3>
            <div className="space-y-3">
              {data.revenueByPlan.map((row) => {
                const maxRevenue = Math.max(
                  ...data.revenueByPlan.map((r) => r.revenue),
                  1,
                );
                return (
                  <div key={row.plan} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground w-14 shrink-0">
                      {row.plan}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${(row.revenue / maxRevenue) * 100}%`,
                          backgroundColor:
                            PLAN_BAR_COLORS[row.plan] ||
                            "hsl(var(--primary))",
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                      {row.userCount} user{row.userCount !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs font-semibold text-foreground w-20 text-right shrink-0">
                      $
                      {row.revenue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      / mo
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-xl p-6"
          >
            <h3 className="font-heading text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> New Subscriptions —
              Last 12 Months
            </h3>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.monthlySubs}
                  margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                >
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val: string) => {
                      const [year, month] = val.split("-");
                      return new Date(
                        Number(year),
                        Number(month) - 1,
                      ).toLocaleString("default", { month: "short" });
                    }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
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
                      return new Date(
                        Number(year),
                        Number(month) - 1,
                      ).toLocaleString("default", {
                        month: "long",
                        year: "numeric",
                      });
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.monthlySubs.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill="hsl(262 83% 58%)"
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card rounded-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <h3 className="font-heading text-base font-semibold text-foreground">
                Recent Approved Subscriptions
              </h3>
            </div>
            {data.recent.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No approved subscriptions yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="border-b border-border">
                    <tr>
                      {["User", "Plan", "Price / mo", "Approved On"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {row.userName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {row.userEmail}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-bold rounded-md px-2 py-1 ${PLAN_COLORS[row.plan] || "bg-muted/60 text-muted-foreground"}`}
                          >
                            {row.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">
                          $
                          {row.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {row.approvedAt
                            ? format(parseISO(row.approvedAt), "PP")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
