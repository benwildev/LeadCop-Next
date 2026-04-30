"use client";

import React from "react";
import { useGetDashboard, type DashboardDataWithPlanConfig } from "@/lib/api-client-react";
import WebhooksTab from "../tabs/WebhooksTab";

export default function WebhooksPage() {
  const { data: rawData } = useGetDashboard();
  const data = rawData as DashboardDataWithPlanConfig | undefined;

  if (!data) return null;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Webhooks</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure webhook integrations</p>
      </div>
      <WebhooksTab plan={data.user.plan} planConfig={data.planConfig} />
    </>
  );
}
