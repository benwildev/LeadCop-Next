"use client";

import React, { useState } from "react";
import { useGetDashboard, useRegenerateApiKey, type DashboardDataWithPlanConfig } from "@/lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import ApiKeysTab from "../tabs/ApiKeysTab";

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const { data: rawData } = useGetDashboard();
  const data = rawData as DashboardDataWithPlanConfig | undefined;
  const regenKeyMutation = useRegenerateApiKey();
  const [copied, setCopied] = useState(false);

  if (!data) return null;

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
        <h1 className="font-heading text-2xl font-bold text-foreground">API Keys</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your API keys for authentication</p>
      </div>
      <ApiKeysTab
        plan={data.user.plan}
        planConfig={data.planConfig}
        apiKey={data.user.apiKey}
        copied={copied}
        onCopy={handleCopy}
        onRegenerate={handleRegenerate}
        regenPending={regenKeyMutation.isPending}
      />
    </>
  );
}
