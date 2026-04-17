import React, { useState } from "react";
import { Webhook, Plus, Trash2, Loader2, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetUserWebhooks, useCreateUserWebhook, useUpdateUserWebhook, useDeleteUserWebhook,
} from "@workspace/api-client-react";
import { errMsg } from "../utils";

const PAYLOAD_EXAMPLE = `POST https://your-app.com/webhook
X-LeadCop-Signature: sha256=<hmac-hex>

{
  "event": "email.detected",
  "email": "user@mailnull.com",
  "domain": "mailnull.com",
  "isDisposable": true,
  "reputationScore": 40,
  "timestamp": "2026-01-01T00:00:00.000Z"
}`;

export default function WebhooksTab({ plan }: { plan: string }) {
  const qc = useQueryClient();
  const hooksQuery = useGetUserWebhooks();
  const createMutation = useCreateUserWebhook();
  const updateMutation = useUpdateUserWebhook();
  const deleteMutation = useDeleteUserWebhook();
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");

  const webhooks = hooksQuery.data?.webhooks ?? [];
  const canCreate = hooksQuery.data?.canCreate ?? (plan === "PRO");
  const isPro = plan === "PRO";

  const handleCreate = async () => {
    if (!url.trim()) return;
    setError("");
    try {
      await createMutation.mutateAsync({ url: url.trim(), secret: secret.trim() || undefined });
      setUrl(""); setSecret("");
      qc.invalidateQueries({ queryKey: ["/api/user/webhooks"] });
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleToggle = async (id: number, enabled: boolean) => {
    await updateMutation.mutateAsync({ id, data: { enabled } });
    qc.invalidateQueries({ queryKey: ["/api/user/webhooks"] });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this webhook?")) return;
    await deleteMutation.mutateAsync(id);
    qc.invalidateQueries({ queryKey: ["/api/user/webhooks"] });
  };

  if (!isPro) {
    return (
      <div className="space-y-6 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Webhook className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground">Custom Integrations (Webhooks)</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Receive a signed HTTP POST to your endpoint every time a disposable email is detected. HMAC-SHA256 signed payloads, multiple endpoints, per-event filtering — all on PRO.
          </p>
          <Link href="/upgrade" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Upgrade to PRO <ArrowUpRight className="h-4 w-4" />
          </Link>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
          <h3 className="font-heading text-sm font-semibold text-foreground mb-3">What you'll receive</h3>
          <pre className="bg-muted/50 rounded-xl p-4 text-xs font-mono text-foreground/80 overflow-x-auto">{PAYLOAD_EXAMPLE}</pre>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Webhook className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Webhooks</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Receive a signed HTTP POST to your endpoint every time a disposable email is detected. We sign the payload with HMAC-SHA256 in the <code className="text-primary">X-LeadCop-Signature</code> header.
        </p>

        {canCreate && (
          <div className="space-y-3 mb-5">
            <input
              type="url"
              placeholder="https://your-app.com/webhook"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Secret (optional, for HMAC signature)"
                value={secret}
                onChange={e => setSecret(e.target.value)}
                className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
              <button onClick={handleCreate} disabled={createMutation.isPending || !url.trim()}
                className="px-4 py-2 bg-primary/15 text-primary hover:bg-primary/25 rounded-xl transition-colors flex items-center gap-1 text-sm font-medium disabled:opacity-50">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Add</>}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        {hooksQuery.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : webhooks.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">No webhooks configured.</p>
        ) : (
          <ul className="space-y-3">
            {webhooks.map((wh: any) => (
              <li key={wh.id} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-foreground truncate">{wh.url}</p>
                  {wh.secret && <p className="text-xs text-muted-foreground mt-0.5">Secret: <code>{wh.secret}</code></p>}
                </div>
                <button
                  onClick={() => handleToggle(wh.id, !wh.enabled)}
                  disabled={updateMutation.isPending}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${wh.enabled ? "bg-green-500/15 text-green-400 hover:bg-green-500/25" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                >
                  {wh.enabled ? "Enabled" : "Disabled"}
                </button>
                <button onClick={() => handleDelete(wh.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
        <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Payload Format</h3>
        <pre className="bg-muted/50 rounded-xl p-4 text-xs font-mono text-foreground/80 overflow-x-auto">{PAYLOAD_EXAMPLE}</pre>
      </motion.div>
    </div>
  );
}
