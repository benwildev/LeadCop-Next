import React, { useState } from "react";
import { ListFilter, Loader2, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { useGetUserAuditLog, type AuditLogEntry } from "@/lib/api-client-react";
import ReputationBadge from "@/components/shared/ReputationBadge";
import { maskEmail } from "../utils";
import { GlassCard, EmptyState, ActionButton, DataTable, type Column } from "@/components/shared";

const auditColumns: Column<AuditLogEntry>[] = [
  {
    key: "timestamp",
    label: "Timestamp",
    render: (e) => (
      <span className="text-foreground/70 text-xs whitespace-nowrap">
        {format(parseISO(e.timestamp), "PP pp")}
      </span>
    ),
  },
  {
    key: "email",
    label: "Email",
    render: (e) => (
      <span className="font-mono text-xs text-foreground/80 max-w-[180px] truncate block">
        {e.email ? maskEmail(e.email) : <span className="text-muted-foreground">—</span>}
      </span>
    ),
  },
  {
    key: "domain",
    label: "Domain",
    render: (e) => (
      <span className="font-mono text-xs text-muted-foreground">
        {e.domain ?? <span className="text-muted-foreground">—</span>}
      </span>
    ),
  },
  {
    key: "isDisposable",
    label: "Disposable",
    render: (e) =>
      e.isDisposable == null ? (
        <span className="text-muted-foreground text-xs">—</span>
      ) : e.isDisposable ? (
        <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
          <AlertTriangle className="h-3 w-3" /> Yes
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
          <CheckCircle2 className="h-3 w-3" /> No
        </span>
      ),
  },
  {
    key: "reputationScore",
    label: "Score",
    render: (e) =>
      e.reputationScore == null ? (
        <span className="text-muted-foreground text-xs">—</span>
      ) : (
        <ReputationBadge score={e.reputationScore} />
      ),
  },
  {
    key: "source" as any,
    label: "Source",
    render: (e: any) => (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
        {e.source || "custom"}
      </span>
    ),
  },
  {
    key: "endpoint",
    label: "Endpoint",
    render: (e) => (
      <span className="font-mono text-xs text-muted-foreground">{e.endpoint}</span>
    ),
  },
];

export default function AuditLogTab() {
  const [page, setPage] = useState(1);
  const limit = 50;
  const { data, isLoading, isFetching } = useGetUserAuditLog({ page, limit });

  const entries = data?.entries ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard padding="p-0" className="overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-primary" />
              <h2 className="font-heading text-base font-semibold text-foreground">Audit Log</h2>
              {total > 0 && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {total.toLocaleString()} entries
                </span>
              )}
            </div>
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <div className="px-6 py-8">
              <EmptyState
                icon={ListFilter}
                title="No API calls logged yet."
                description="Make your first API request to see entries here."
              />
            </div>
          ) : (
            <>
              <DataTable<AuditLogEntry>
                columns={auditColumns}
                rows={entries}
              />
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex items-center gap-2">
                    <ActionButton
                      icon={ChevronLeft}
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    />
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            p === page ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <ActionButton
                      icon={ChevronRight}
                      variant="outline"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
