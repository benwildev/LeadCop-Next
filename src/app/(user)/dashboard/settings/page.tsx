"use client";

import React from "react";
import { useGetDashboard, type DashboardDataWithPlanConfig } from "@/lib/api-client-react";
import SettingsTab from "../tabs/SettingsTab";

export default function SettingsPage() {
  const { data: rawData } = useGetDashboard();
  const data = rawData as DashboardDataWithPlanConfig | undefined;

  if (!data) return null;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configure your account preferences</p>
      </div>
      <SettingsTab planConfig={data.planConfig} plan={data.user.plan} apiKey={data.user.apiKey} />
    </>
  );
}
