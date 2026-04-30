"use client";

import React from "react";
import { useGetDashboard, type DashboardDataWithPlanConfig } from "@/lib/api-client-react";
import AnalyticsTab from "../tabs/AnalyticsTab";

export default function AnalyticsPage() {
  const { data: rawData } = useGetDashboard();
  const data = rawData as DashboardDataWithPlanConfig | undefined;

  if (!data) return null;

  const usagePct = data.user.requestLimit > 0
    ? Math.min(100, (data.user.requestCount / data.user.requestLimit) * 100)
    : 0;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Monitor your API usage and validation insights</p>
      </div>
      <AnalyticsTab data={data} usagePct={usagePct} />
    </>
  );
}
