import { useState } from "react";
import {
  useAdminGetStats,
  useAdminSyncDomains,
  useAdminAddDomain,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Database, RefreshCw, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { SectionHeader, GlassCard, ActionButton, PageHeader } from "@/components/shared";

export function DomainsSection() {
  const qc = useQueryClient();
  const statsQuery = useAdminGetStats();
  const syncMutation = useAdminSyncDomains();
  const addMutation = useAdminAddDomain();
  const [syncResult, setSyncResult] = useState<{ added: number; total: number } | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [addResult, setAddResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSync = async () => {
    setSyncResult(null);
    try {
      const data = await syncMutation.mutateAsync();
      setSyncResult({ added: data.domainsAdded, total: data.totalDomains });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    } catch {
      alert("Sync failed. Check server logs.");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddResult(null);
    const trimmed = newDomain.trim();
    if (!trimmed) return;
    try {
      const data = await addMutation.mutateAsync(trimmed);
      setAddResult({ ok: true, msg: `✓ "${data.domain}" added — total: ${data.totalDomains.toLocaleString()}` });
      setNewDomain("");
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : "Failed to add domain";
      const msg =
        errMessage.includes("409") || errMessage.toLowerCase().includes("already")
          ? "Domain already exists in the blocklist"
          : errMessage;
      setAddResult({ ok: false, msg: `✗ ${msg}` });
    }
  };

  return (
    <div>
      <SectionHeader title="Domain Database" subtitle="Manage the disposable email domain blocklist" />
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard rounded="rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Total Domains</span>
            </div>
            <div className="font-heading text-3xl font-bold text-foreground">
              {statsQuery.data?.totalDomains.toLocaleString() ?? "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Disposable email domains in the blocklist</p>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard rounded="rounded-xl">
            <h3 className="font-heading text-base font-semibold text-foreground mb-2">Sync from GitHub</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Pull the latest disposable domain list from the upstream GitHub repository.
            </p>
            <ActionButton
              icon={RefreshCw}
              variant="ghost"
              loading={syncMutation.isPending}
              onClick={handleSync}
            >
              {syncMutation.isPending ? "Syncing…" : "Sync Now"}
            </ActionButton>
            {syncResult && (
              <p className="text-xs text-green-400 mt-3">
                ✓ Added {syncResult.added} domains — total: {syncResult.total.toLocaleString()}
              </p>
            )}
          </GlassCard>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard rounded="rounded-xl">
          <PageHeader
            title="Add Domain Manually"
            description="Add a single domain to the blocklist immediately. It takes effect in real-time without a restart."
          />
          <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => { setNewDomain(e.target.value); setAddResult(null); }}
              placeholder="e.g. mailinator.com"
              className="flex-1 min-w-48 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              disabled={addMutation.isPending}
            />
            <ActionButton
              icon={Plus}
              variant="primary"
              loading={addMutation.isPending}
              disabled={!newDomain.trim()}
            >
              {addMutation.isPending ? "Adding…" : "Add Domain"}
            </ActionButton>
          </form>
          {addResult && (
            <p className={`text-xs mt-3 ${addResult.ok ? "text-green-400" : "text-red-400"}`}>
              {addResult.msg}
            </p>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
