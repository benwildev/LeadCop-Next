import React from "react";

function Pulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted/60 ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-5 space-y-3">
            <Pulse className="h-3 w-20" />
            <Pulse className="h-8 w-24" />
            <Pulse className="h-1.5 w-full" />
          </div>
        ))}
      </div>

      {/* API Key card */}
      <div className="glass-card rounded-2xl p-6 space-y-3">
        <Pulse className="h-4 w-32" />
        <Pulse className="h-12 w-full" />
        <Pulse className="h-3 w-48" />
      </div>

      {/* Chart */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <Pulse className="h-4 w-40" />
        <Pulse className="h-[260px] w-full rounded-xl" />
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl p-6 space-y-3">
        <Pulse className="h-4 w-36" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Pulse key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
