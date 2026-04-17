import React, { useState } from "react";
import { Key, Copy, RefreshCw, CheckCircle2, Code, Plus, Trash2, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetUserApiKeys, useCreateUserApiKey, useDeleteUserApiKey } from "@workspace/api-client-react";
import { errMsg } from "../utils";

export default function ApiKeysTab({
  plan, apiKey, copied, onCopy, onRegenerate, regenPending,
}: {
  plan: string;
  apiKey: string;
  copied: boolean;
  onCopy: (text: string) => void;
  onRegenerate: () => void;
  regenPending: boolean;
}) {
  const qc = useQueryClient();
  const keysQuery = useGetUserApiKeys();
  const createMutation = useCreateUserApiKey();
  const deleteMutation = useDeleteUserApiKey();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());
  const [newlyCreated, setNewlyCreated] = useState<{ id: number; key: string } | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [scriptCopied, setScriptCopied] = useState(false);

  const keys = keysQuery.data?.keys ?? [];

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError("");
    try {
      const res = await createMutation.mutateAsync(name.trim());
      setNewlyCreated({ id: res.key.id, key: res.key.key! });
      setName("");
      qc.invalidateQueries({ queryKey: ["/api/user/api-keys"] });
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this API key? It will stop working immediately.")) return;
    await deleteMutation.mutateAsync(id);
    if (newlyCreated?.id === id) setNewlyCreated(null);
    qc.invalidateQueries({ queryKey: ["/api/user/api-keys"] });
  };

  const handleCopySingle = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleReveal = (id: number) => {
    setRevealedKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const scriptSnippet = `<script\n  src="${typeof window !== "undefined" ? window.location.origin : ""}/temp-email-validator.js"\n  data-api-key="${apiKey}">\n</script>`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptSnippet);
    setScriptCopied(true);
    setTimeout(() => setScriptCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Primary API Key */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Primary API Key</h2>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg border border-border bg-muted/50 px-4 py-3 font-mono text-sm text-foreground/80 flex items-center overflow-x-auto">
            {apiKey}
          </div>
          <button onClick={() => onCopy(apiKey)}
            className="p-3 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Copy">
            {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
          <button onClick={onRegenerate} disabled={regenPending}
            className="p-3 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Regenerate">
            <RefreshCw className={`h-4 w-4 ${regenPending ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Include as{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-primary text-xs">Authorization: Bearer &lt;key&gt;</code>
          {" "}in your requests.
        </p>
      </motion.div>

      {/* Embed Script */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base font-semibold text-foreground">Embed Script</h2>
          </div>
          <button
            onClick={handleCopyScript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors text-xs font-medium"
          >
            {scriptCopied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {scriptCopied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Paste this before the closing <code className="rounded bg-muted px-1 py-0.5 text-primary text-xs">&lt;/body&gt;</code> tag on any page you want to protect.
        </p>
        <pre className="rounded-xl bg-muted/60 border border-border px-4 py-3 text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre select-all">{scriptSnippet}</pre>
      </motion.div>

      {/* Named API Keys */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Key className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Named API Keys</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Create multiple named keys for different integrations. Each key is tied to your account quota.
          {plan === "FREE" ? (
            <span className="text-yellow-400"> Named keys require BASIC or PRO. <Link href="/upgrade" className="underline underline-offset-2">Upgrade your plan.</Link></span>
          ) : plan === "BASIC" ? (
            <span className="text-yellow-400"> BASIC allows 1 named key. Upgrade to PRO for up to 10.</span>
          ) : (
            <span> PRO plans support up to 10 named keys.</span>
          )}
        </p>

        {plan !== "FREE" && (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Key name (e.g. production, staging)"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            <button onClick={handleCreate} disabled={createMutation.isPending || !name.trim()}
              className="px-4 py-2 bg-primary/15 text-primary hover:bg-primary/25 rounded-xl transition-colors flex items-center gap-1 text-sm font-medium disabled:opacity-50">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Create</>}
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        {newlyCreated && (
          <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
            <p className="text-xs font-medium text-green-400 mb-2">Key created — copy it now, it won't be shown again in full.</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 font-mono text-xs text-green-300 break-all">{newlyCreated.key}</code>
              <button onClick={() => handleCopySingle(newlyCreated.id, newlyCreated.key)}
                className="p-2 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors">
                {copiedId === newlyCreated.id ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => setNewlyCreated(null)} className="p-2 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {keysQuery.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : keys.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">No named keys yet.</p>
        ) : (
          <ul className="space-y-2">
            {keys.map((k: any) => (
              <li key={k.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                <Key className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground flex-1">{k.name}</span>
                <code className="font-mono text-xs text-muted-foreground">{k.maskedKey}</code>
                <button onClick={() => handleCopySingle(k.id, k.maskedKey)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                  {copiedId === k.id ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => handleDelete(k.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
