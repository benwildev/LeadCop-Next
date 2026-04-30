"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetDashboard, useRegenerateApiKey, type DashboardDataWithPlanConfig } from "@/lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import OverviewTab from "./tabs/OverviewTab";

export default function DashboardOverview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: rawData } = useGetDashboard();
  const data = rawData as DashboardDataWithPlanConfig | undefined;
  const regenKeyMutation = useRegenerateApiKey();
  const [copied, setCopied] = useState(false);

  if (!data || !user) return null;

  const usagePct = data.user.requestLimit > 0
    ? Math.min(100, (data.user.requestCount / data.user.requestLimit) * 100)
    : 0;

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

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Welcome back, {user.name}</p>
      </div>
      
      <OverviewTab
        data={data}
        usagePct={usagePct}
        copied={copied}
        onCopy={handleCopy}
        onRegenerate={handleRegenerate}
        regenPending={regenKeyMutation.isPending}
      />
    </>
  );
}
