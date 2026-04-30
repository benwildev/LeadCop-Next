"use client";

import React from "react";
import { useGetDashboard, type DashboardDataWithPlanConfig } from "@/lib/api-client-react";
import BlocklistTab from "../tabs/BlocklistTab";

export default function BlocklistPage() {
  const { data: rawData } = useGetDashboard();
  const data = rawData as DashboardDataWithPlanConfig | undefined;

  if (!data) return null;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Blocklist</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your custom domain blocklist</p>
      </div>
      <BlocklistTab plan={data.user.plan} planConfig={data.planConfig} />
    </>
  );
}
