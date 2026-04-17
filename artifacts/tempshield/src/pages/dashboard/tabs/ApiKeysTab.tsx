import React, { useState } from "react";
import { Key, Copy, RefreshCw, CheckCircle2, Code, Plus, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetUserApiKeys, useCreateUserApiKey, useDeleteUserApiKey, type UserApiKey } from "@workspace/api-client-react";
import { errMsg } from "../utils";
import { GlassCard, EmptyState, ActionButton, PageHeader } from "@/components/shared";

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

  const scriptSnippet = `<script\n  src="${typeof window !== "undefined" ? window.location.origin : ""}/temp-email-validator.js"\n  data-api-key="${apiKey}">\n</script>`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptSnippet);
    setScriptCopied(true);
    setTimeout(() => setScriptCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Primary API Key */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-4 w-4 text-primary" />
            <h2 className="font-heading text-base font-semibold text-foreground">Primary API Key</h2>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border border-border bg-muted/50 px-4 py-3 font-mono text-sm text-foreground/80 flex items-center overflow-x-auto">
              {apiKey}
            </div>
            <ActionButton
              icon={copied ? CheckCircle2 : Copy}
              variant="outline"
              onClick={() => onCopy(apiKey)}
              title="Copy"
              className={copied ? "text-green-500" : ""}
            />
            <ActionButton
              variant="outline"
              icon={RefreshCw}
              loading={regenPending}
              onClick={onRegenerate}
              title="Regenerate"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Include as{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-primary text-xs">Authorization: Bearer &lt;key&gt;</code>
            {" "}in your requests.
          </p>
        </GlassCard>
      </motion.div>

      {/* Embed Script */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
        <GlassCard>
          <PageHeader
            title="Embed Script"
            description={<>Paste this before the closing <code className="rounded bg-muted px-1 py-0.5 text-primary text-xs">&lt;/body&gt;</code> tag on any page you want to protect.</>}
            action={
              <ActionButton icon={scriptCopied ? CheckCircle2 : Copy} variant="ghost" onClick={handleCopyScript}>
                {scriptCopied ? "Copied!" : "Copy"}
              </ActionButton>
            }
          />
          <pre className="rounded-xl bg-muted/60 border border-border px-4 py-3 text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre select-all">{scriptSnippet}</pre>
        </GlassCard>
      </motion.div>

      {/* Named API Keys */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard>
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
              <ActionButton
                icon={Plus}
                variant="ghost"
                loading={createMutation.isPending}
                disabled={!name.trim()}
                onClick={handleCreate}
              >
                Create
              </ActionButton>
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
            <EmptyState title="Loading..." />
          ) : keys.length === 0 ? (
            <EmptyState icon={Key} title="No named keys yet." description="Create a named key above to get started." />
          ) : (
            <ul className="space-y-2">
              {keys.map((k: UserApiKey) => (
                <li key={k.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                  <Key className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground flex-1">{k.name}</span>
                  <code className="font-mono text-xs text-muted-foreground">{k.maskedKey}</code>
                  <button onClick={() => handleCopySingle(k.id, k.maskedKey)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                    {copiedId === k.id ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <ActionButton icon={Trash2} variant="danger" onClick={() => handleDelete(k.id)} title="Delete key" />
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
