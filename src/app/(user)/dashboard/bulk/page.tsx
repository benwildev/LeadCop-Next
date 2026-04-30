"use client";

import React from "react";
import { useGetDashboard, type DashboardDataWithPlanConfig } from "@/lib/api-client-react";
import BulkTab from "../tabs/BulkTab";

export default function BulkPage() {
  const { data: rawData } = useGetDashboard();
  const data = rawData as DashboardDataWithPlanConfig | undefined;

  if (!data) return null;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Bulk Validation</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Validate emails in bulk with CSV upload</p>
      </div>
      <BulkTab planConfig={data.planConfig} />
    </>
  );
}
