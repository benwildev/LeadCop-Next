import React, { useState } from "react";
import { ShieldBan, Plus, Trash2, Loader2, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useGetBlocklist, useAddBlocklistEntry, useDeleteBlocklistEntry } from "@workspace/api-client-react";
import { errMsg } from "../utils";

export default function BlocklistTab({ plan }: { plan: string }) {
  const qc = useQueryClient();
  const listQuery = useGetBlocklist();
  const addMutation = useAddBlocklistEntry();
  const deleteMutation = useDeleteBlocklistEntry();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  if (plan === "FREE") {
    return (
      <div className="space-y-6 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldBan className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground">Custom Blocklist</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Block specific domains from passing verification by maintaining your own custom blocklist. Available on BASIC and PRO plans.
          </p>
          <Link href="/upgrade" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Upgrade to BASIC <ArrowUpRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  const entries = listQuery.data?.entries ?? [];

  const handleAdd = async () => {
    if (!input.trim()) return;
    setError("");
    try {
      await addMutation.mutateAsync(input.trim().toLowerCase());
      setInput("");
      qc.invalidateQueries({ queryKey: ["/api/user/blocklist"] });
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id);
    qc.invalidateQueries({ queryKey: ["/api/user/blocklist"] });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldBan className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Custom Blocklist</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Add any domain to your personal blocklist. Emails from these domains will be flagged as disposable regardless of our global database.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="spam-domain.com"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
          <button onClick={handleAdd} disabled={addMutation.isPending || !input.trim()}
            className="px-4 py-2 bg-primary/15 text-primary hover:bg-primary/25 rounded-xl transition-colors flex items-center gap-1 text-sm font-medium disabled:opacity-50">
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Block</>}
          </button>
        </div>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        {listQuery.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : entries.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">No domains blocked yet.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e: any) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <ShieldBan className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-sm font-mono text-foreground">{e.domain}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{format(parseISO(e.createdAt), "PP")}</span>
                  <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
