"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGetDashboard, type DashboardDataWithPlanConfig } from "@/lib/api-client-react";
import { DashboardSidebar, type DashboardTab } from "@/components/dashboard/DashboardSidebar";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { usePathname, useRouter } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: rawData, isLoading } = useGetDashboard();
  const data = rawData as DashboardDataWithPlanConfig | undefined;
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Derive active tab from pathname
  const activeTab = (pathname.split("/").pop() || "overview") as DashboardTab;

  const usagePct = data && data.user.requestLimit > 0
    ? Math.min(100, (data.user.requestCount / data.user.requestLimit) * 100)
    : 0;

  const handleTabChange = (tab: DashboardTab) => {
    if (tab === "overview") {
      router.push("/dashboard");
    } else {
      router.push(`/dashboard/${tab}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="w-[260px] border-r border-border h-screen" />
        <main className="flex-1 p-8 pt-20 lg:pt-8">
           <DashboardSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        usagePct={usagePct}
        requestCount={data?.user.requestCount ?? 0}
        requestLimit={data?.user.requestLimit ?? 0}
        plan={data?.user.plan ?? "FREE"}
        collapsed={collapsed}
        onCollapse={setCollapsed}
      />

      <main className={`min-h-screen transition-all duration-200 ${collapsed ? "lg:pl-[68px]" : "lg:pl-[260px]"}`}>
        <div className="max-w-5xl mx-auto px-6 py-8 pt-20 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
