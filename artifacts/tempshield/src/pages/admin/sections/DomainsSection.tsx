import { useState } from "react";
import {
  useAdminGetStats,
  useAdminSyncDomains,
  useAdminAddDomain,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Database, RefreshCw, Loader2, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { SectionHeader } from "@/components/shared";

export function DomainsSection() {
  const qc = useQueryClient();
  const statsQuery = useAdminGetStats();
  const syncMutation = useAdminSyncDomains();
  const addMutation = useAdminAddDomain();
  const [syncResult, setSyncResult] = useState<{
    added: number;
    total: number;
  } | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [addResult, setAddResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

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
      setAddResult({
        ok: true,
        msg: `✓ "${data.domain}" added — total: ${data.totalDomains.toLocaleString()}`,
      });
      setNewDomain("");
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    } catch (err: any) {
      const msg =
        err?.message?.includes("409") ||
        err?.message?.toLowerCase().includes("already")
          ? "Domain already exists in the blocklist"
          : (err?.message ?? "Failed to add domain");
      setAddResult({ ok: false, msg: `✗ ${msg}` });
    }
  };

  return (
    <div>
      <SectionHeader
        title="Domain Database"
        subtitle="Manage the disposable email domain blocklist"
      />
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">
              Total Domains
            </span>
          </div>
          <div className="font-heading text-3xl font-bold text-foreground">
            {statsQuery.data?.totalDomains.toLocaleString() ?? "—"}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Disposable email domains in the blocklist
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-6"
        >
          <h3 className="font-heading text-base font-semibold text-foreground mb-2">
            Sync from GitHub
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Pull the latest disposable domain list from the upstream GitHub
            repository.
          </p>
          <button
            onClick={handleSync}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary/15 text-primary hover:bg-primary/25 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
          >
            <RefreshCw
              className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
            />
            {syncMutation.isPending ? "Syncing…" : "Sync Now"}
          </button>
          {syncResult && (
            <p className="text-xs text-green-400 mt-3">
              ✓ Added {syncResult.added} domains — total:{" "}
              {syncResult.total.toLocaleString()}
            </p>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="font-heading text-base font-semibold text-foreground mb-1">
          Add Domain Manually
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add a single domain to the blocklist immediately. It takes effect in
          real-time without a restart.
        </p>
        <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => {
              setNewDomain(e.target.value);
              setAddResult(null);
            }}
            placeholder="e.g. mailinator.com"
            className="flex-1 min-w-48 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            disabled={addMutation.isPending}
          />
          <button
            type="submit"
            disabled={addMutation.isPending || !newDomain.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
          >
            {addMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {addMutation.isPending ? "Adding…" : "Add Domain"}
          </button>
        </form>
        {addResult && (
          <p
            className={`text-xs mt-3 ${addResult.ok ? "text-green-400" : "text-red-400"}`}
          >
            {addResult.msg}
          </p>
        )}
      </motion.div>
    </div>
  );
}
