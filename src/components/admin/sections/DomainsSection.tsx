import { useState } from "react";
import {
  useAdminGetStats,
  useAdminSyncDomains,
  useAdminAddDomain,
  useAdminGetWhitelist,
  useAdminAddWhitelist,
  useAdminDeleteWhitelist,
} from "@/lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Database, RefreshCw, Plus, ShieldCheck, Trash2, Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { SectionHeader, GlassCard, ActionButton, PageHeader, ConfirmDialog } from "@/components/shared";

export function DomainsSection() {
  const qc = useQueryClient();
  const statsQuery = useAdminGetStats();
  const syncMutation = useAdminSyncDomains();
  const addMutation = useAdminAddDomain();
  const whitelistQuery = useAdminGetWhitelist();
  const addWhitelistMutation = useAdminAddWhitelist();
  const deleteWhitelistMutation = useAdminDeleteWhitelist();

  const [activeTab, setActiveTab] = useState<"blocklist" | "whitelist">("blocklist");
  const [syncResult, setSyncResult] = useState<{ added: number; total: number } | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [addResult, setAddResult] = useState<{ ok: boolean; msg: string } | null>(null);
  
  const [whitelistSearch, setWhitelistSearch] = useState("");
  const [newWhitelistDomain, setNewWhitelistDomain] = useState("");
  const [whitelistAddResult, setWhitelistAddResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncResult(null);
    try {
      const data = await syncMutation.mutateAsync();
      setSyncResult({ added: data.domainsAdded, total: data.totalDomains });
      toast.success(`Sync complete! Added ${data.domainsAdded} new domains.`);
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    } catch {
      toast.error("Database sync failed. Check server logs.");
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

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhitelistAddResult(null);
    const trimmed = newWhitelistDomain.trim();
    if (!trimmed) return;
    try {
      await addWhitelistMutation.mutateAsync(trimmed);
      setWhitelistAddResult({ ok: true, msg: `✓ "${trimmed}" added to whitelist` });
      setNewWhitelistDomain("");
      whitelistQuery.refetch();
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    } catch (err) {
      setWhitelistAddResult({ ok: false, msg: "✗ Failed to whitelist domain" });
    }
  };

  const executeDeleteWhitelist = async (domain: string) => {
    try {
      await deleteWhitelistMutation.mutateAsync(domain);
      toast.success(`"${domain}" removed from whitelist`);
      whitelistQuery.refetch();
    } catch {
      toast.error("Failed to remove from whitelist");
    }
  };

  const filteredWhitelist = (whitelistQuery.data?.whitelist ?? []).filter(item => 
    item.domain.toLowerCase().includes(whitelistSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SectionHeader 
        title="Domain Protection" 
        subtitle="Manage blocklists and whitelist exceptions" 
      />

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("blocklist")}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "blocklist" 
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
              : "text-muted-foreground hover:bg-white/5"
          }`}
        >
          Blocklist Database
        </button>
        <button
          onClick={() => setActiveTab("whitelist")}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "whitelist" 
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
              : "text-muted-foreground hover:bg-white/5"
          }`}
        >
          Whitelist Exceptions
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "blocklist" ? (
          <motion.div
            key="blocklist"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <GlassCard rounded="rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Blocked Domains</span>
                </div>
                <div className="font-heading text-4xl font-bold text-foreground">
                  {statsQuery.data?.totalDomains.toLocaleString() ?? "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  Total cumulative domains from all synchronization sources currently being blocked.
                </p>
              </GlassCard>

              <GlassCard rounded="rounded-2xl">
                <h3 className="font-heading text-lg font-bold text-foreground mb-1">Sync Sources</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Update database from upstream GitHub providers.
                </p>
                <div className="flex items-center justify-between">
                  <ActionButton
                    icon={RefreshCw}
                    variant="primary"
                    loading={syncMutation.isPending}
                    onClick={handleSync}
                    className="px-8"
                  >
                    {syncMutation.isPending ? "Syncing Providers…" : "Sync All Now"}
                  </ActionButton>
                  {syncResult && (
                    <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
                      Sync OK: +{syncResult.added} domains
                    </span>
                  )}
                </div>
              </GlassCard>
            </div>

            <GlassCard rounded="rounded-2xl">
              <PageHeader
                title="Add Manual Block"
                description="Immediately block a specific domain across the entire platform. This bypasses the next sync update."
              />
              <form onSubmit={handleAdd} className="flex gap-3 mt-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => { setNewDomain(e.target.value); setAddResult(null); }}
                    placeholder="e.g. mailinator.com"
                    className="w-full pl-4 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    disabled={addMutation.isPending}
                  />
                </div>
                <ActionButton
                  icon={Plus}
                  variant="secondary"
                  loading={addMutation.isPending}
                  disabled={!newDomain.trim()}
                  className="px-6"
                >
                  {addMutation.isPending ? "Adding…" : "Add to Blocklist"}
                </ActionButton>
              </form>
              {addResult && (
                <div className={`mt-4 p-3 rounded-xl text-sm font-medium border ${
                  addResult.ok 
                    ? "bg-green-400/10 border-green-400/20 text-green-400" 
                    : "bg-red-400/10 border-red-400/20 text-red-400"
                }`}>
                  {addResult.msg}
                </div>
              )}
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            key="whitelist"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-1 space-y-6">
                <GlassCard rounded="rounded-2xl" className="h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Safe Domains</span>
                  </div>
                  <div className="font-heading text-4xl font-bold text-foreground">
                    {whitelistQuery.data?.whitelist.length ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    Whitelisted domains are **always allowed**, even if they appear in an updated upstream blocklist.
                  </p>
                  
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <h4 className="text-sm font-semibold mb-4">Add to Whitelist</h4>
                    <form onSubmit={handleAddWhitelist} className="space-y-3">
                      <input
                        type="text"
                        value={newWhitelistDomain}
                        onChange={(e) => { setNewWhitelistDomain(e.target.value); setWhitelistAddResult(null); }}
                        placeholder="e.g. gmail.com"
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-green-400/40"
                      />
                      <ActionButton
                        icon={Plus}
                        variant="secondary"
                        loading={addWhitelistMutation.isPending}
                        disabled={!newWhitelistDomain.trim()}
                        className="w-full justify-center bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30"
                      >
                        Whitelist Domain
                      </ActionButton>
                    </form>
                    {whitelistAddResult && (
                      <p className={`text-xs mt-3 font-medium ${whitelistAddResult.ok ? "text-green-400" : "text-red-400"}`}>
                        {whitelistAddResult.msg}
                      </p>
                    )}
                  </div>
                </GlassCard>
              </div>

              <div className="md:col-span-2">
                <GlassCard rounded="rounded-2xl" className="h-full flex flex-col p-0">
                  <div className="p-6 border-b border-white/10 flex items-center justify-between gap-4">
                    <h3 className="font-heading text-lg font-bold">Managed Exceptions</h3>
                    <div className="relative flex-1 max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search whitelist..."
                        value={whitelistSearch}
                        onChange={(e) => setWhitelistSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto max-h-[450px]">
                    {whitelistQuery.isLoading ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredWhitelist.length > 0 ? (
                      <table className="w-full text-left">
                        <thead className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold border-b border-white/10">
                          <tr>
                            <th className="px-6 py-4">Domain Name</th>
                            <th className="px-6 py-4">Whitelisted On</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredWhitelist.map((item) => (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                              <td className="px-6 py-4 text-sm font-semibold text-foreground">
                                {item.domain}
                              </td>
                              <td className="px-6 py-4 text-xs text-muted-foreground">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => setConfirmDelete(item.domain)}
                                  disabled={deleteWhitelistMutation.isPending}
                                  className="p-2 rounded-lg text-muted-foreground hover:bg-red-400/20 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                                  title="Remove from whitelist"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-60 text-center px-10">
                        <ShieldCheck className="w-10 h-10 text-white/10 mb-4" />
                        <p className="text-sm text-muted-foreground font-medium">No whitelisted domains found.</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Add domains that should bypass the protection database.
                        </p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && executeDeleteWhitelist(confirmDelete)}
        title="Remove Whitelist Exception"
        description={`Are you sure you want to remove ${confirmDelete} from the whitelist? This domain will immediately be subject to blocklist checks.`}
        confirmText="Remove from Whitelist"
        variant="danger"
      />
    </div>
  );
}
