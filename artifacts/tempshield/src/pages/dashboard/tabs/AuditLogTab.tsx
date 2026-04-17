import React, { useState } from "react";
import { ListFilter, Loader2, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { useGetUserAuditLog, type AuditLogEntry } from "@workspace/api-client-react";
import ReputationBadge from "@/components/ReputationBadge";
import { maskEmail } from "../utils";

export default function AuditLogTab() {
  const [page, setPage] = useState(1);
  const limit = 50;
  const { data, isLoading, isFetching } = useGetUserAuditLog({ page, limit });

  const entries = data?.entries ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
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
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border">
                    {["Timestamp", "Email", "Domain", "Disposable", "Score", "Endpoint"].map(h => (
                      <th key={h} className="pb-3 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                        No API calls logged yet. Make your first API request to see entries here.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry: AuditLogEntry) => (
                      <tr key={entry.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-3 pr-4 text-foreground/70 text-xs whitespace-nowrap">
                          {format(parseISO(entry.timestamp), "PP pp")}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-foreground/80 max-w-[180px] truncate">
                          {entry.email ? maskEmail(entry.email) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                          {entry.domain ?? <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-3 pr-4">
                          {entry.isDisposable == null ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : entry.isDisposable ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                              <AlertTriangle className="h-3 w-3" /> Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                              <CheckCircle2 className="h-3 w-3" /> No
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {entry.reputationScore == null ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                            <ReputationBadge score={entry.reputationScore} />
                          )}
                        </td>
                        <td className="py-3 font-mono text-xs text-muted-foreground">{entry.endpoint}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
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
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
