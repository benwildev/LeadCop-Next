import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Navbar, PageTransition } from "@/components/Layout";
import {
  useGetDashboard,
  useRegenerateApiKey,
  type DashboardDataWithPlanConfig,
} from "@workspace/api-client-react";
import {
  BarChart3, TrendingUp, Layers, Key, Webhook, ShieldBan,
  ListFilter, CreditCard, Globe, MessageSquare, Activity, ArrowUpRight,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import OverviewTab from "./dashboard/tabs/OverviewTab";
import AnalyticsTab from "./dashboard/tabs/AnalyticsTab";
import AuditLogTab from "./dashboard/tabs/AuditLogTab";
import ApiKeysTab from "./dashboard/tabs/ApiKeysTab";
import WebhooksTab from "./dashboard/tabs/WebhooksTab";
import BlocklistTab from "./dashboard/tabs/BlocklistTab";
import SettingsTab from "./dashboard/tabs/SettingsTab";
import BillingTab from "./dashboard/tabs/BillingTab";
import BulkVerifyTab from "./dashboard/tabs/BulkVerifyTab";

type Tab = "overview" | "analytics" | "keys" | "webhooks" | "blocklist" | "settings" | "audit" | "billing" | "bulk";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "bulk", label: "Bulk Verify", icon: Layers },
  { id: "keys", label: "API Keys", icon: Key },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "blocklist", label: "Blocklist", icon: ShieldBan },
  { id: "audit", label: "Audit Log", icon: ListFilter },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Globe },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: rawData, isLoading } = useGetDashboard();
  const data = rawData as DashboardDataWithPlanConfig | undefined;
  const regenKeyMutation = useRegenerateApiKey();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (!user) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (confirm("Are you sure? Your old API key will stop working immediately.")) {
      await regenKeyMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: [`/api/user/dashboard`] });
      queryClient.invalidateQueries({ queryKey: [`/api/auth/me`] });
    }
  };

  const usagePct = data
    ? Math.min(100, (data.user.requestCount / data.user.requestLimit) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <div className="max-w-6xl mx-auto px-6 w-full">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 mt-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">Welcome back, {user.name}</p>
            </div>
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted self-start sm:self-auto"
            >
              Upgrade Plan <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-6 overflow-x-auto no-scrollbar">
            <div className="flex gap-1 bg-muted/30 rounded-xl p-1 min-w-max">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
              <Link href="/support" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap text-muted-foreground hover:text-foreground">
                <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Support</span>
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Activity className="h-8 w-8 text-primary animate-pulse" />
            </div>
          ) : data ? (
            <>
              {activeTab === "overview" && (
                <OverviewTab
                  data={data}
                  usagePct={usagePct}
                  copied={copied}
                  onCopy={handleCopy}
                  onRegenerate={handleRegenerate}
                  regenPending={regenKeyMutation.isPending}
                />
              )}
              {activeTab === "analytics" && <AnalyticsTab data={data} usagePct={usagePct} />}
              {activeTab === "keys" && (
                <ApiKeysTab
                  plan={data.user.plan}
                  apiKey={data.user.apiKey}
                  copied={copied}
                  onCopy={handleCopy}
                  onRegenerate={handleRegenerate}
                  regenPending={regenKeyMutation.isPending}
                />
              )}
              {activeTab === "webhooks" && <WebhooksTab plan={data.user.plan} />}
              {activeTab === "blocklist" && <BlocklistTab plan={data.user.plan} />}
              {activeTab === "audit" && <AuditLogTab />}
              {activeTab === "billing" && <BillingTab />}
              {activeTab === "bulk" && (
                <BulkVerifyTab plan={data.user.plan} maxBulkEmails={data.planConfig.maxBulkEmails} />
              )}
              {activeTab === "settings" && (
                <SettingsTab planConfig={data.planConfig} plan={data.user.plan} />
              )}
            </>
          ) : null}
        </div>
      </PageTransition>
    </div>
  );
}
