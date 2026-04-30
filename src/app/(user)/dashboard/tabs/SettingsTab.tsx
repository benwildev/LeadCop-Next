import React, { useState } from "react";
import { Globe, FileText, Shield, Download, Plus, X, Loader2, CheckCircle2, Code, Copy } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import {
  useGetUserWebsites, useAddUserWebsite, useDeleteUserWebsite,
  useGetUserPages, useAddUserPage, useDeleteUserPage,
  type DashboardPlanConfig,
  type UserWebsite,
  type UserPage,
  axiosSecure,
} from "@/lib/api-client-react";
import { errMsg } from "../utils";
import { GlassCard, EmptyState, ActionButton } from "@/components/shared";

const FREE_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
  "icloud.com", "aol.com", "protonmail.com", "proton.me", "zoho.com",
  "yandex.com", "mail.com", "gmx.com", "fastmail.com", "tutanota.com",
  "hey.com", "msn.com", "me.com", "mac.com", "pm.me",
];

function WebsitesPanel({ planConfig, plan }: { planConfig?: DashboardPlanConfig; plan: string }) {
  const qc = useQueryClient();
  const websitesQuery = useGetUserWebsites();
  const addMutation = useAddUserWebsite();
  const deleteMutation = useDeleteUserWebsite();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const websites = websitesQuery.data?.websites || [];
  const limit = planConfig?.websiteLimit ?? 0;

  const handleAdd = async () => {
    if (!input.trim()) return;
    setError("");
    try {
      await addMutation.mutateAsync(input.trim().toLowerCase());
      setInput("");
      qc.invalidateQueries({ queryKey: ["/api/user/websites"] });
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      qc.invalidateQueries({ queryKey: ["/api/user/websites"] });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard>
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Allowed Websites</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Domains that may use your API key.{" "}
          {limit > 0
            ? <span>{websites.length} / {limit} used</span>
            : <span className="text-yellow-400">Not available on your plan.</span>}
        </p>

        {limit > 0 && (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="example.com"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            <ActionButton icon={Plus} variant="ghost" loading={addMutation.isPending} disabled={!input.trim()} onClick={handleAdd} />
          </div>
        )}

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        {websitesQuery.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : websites.length === 0 ? (
          <EmptyState
            icon={Globe}
            title={plan === "FREE" ? "Upgrade your plan to add websites." : "No websites added yet."}
          />
        ) : (
          <ul className="space-y-2">
            {websites.map((w: UserWebsite) => (
              <li key={w.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-sm font-mono text-foreground">{w.domain}</span>
                <ActionButton icon={X} variant="danger" onClick={() => handleDelete(w.id)} title="Remove website" />
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </motion.div>
  );
}

function PagesPanel({ planConfig, plan }: { planConfig?: DashboardPlanConfig; plan: string }) {
  const qc = useQueryClient();
  const pagesQuery = useGetUserPages();
  const addMutation = useAddUserPage();
  const deleteMutation = useDeleteUserPage();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const pages = pagesQuery.data?.pages || [];
  const limit = (planConfig as any)?.dataLimit ?? 0;

  const handleAdd = async () => {
    if (!input.trim()) return;
    const path = input.trim().startsWith("/") ? input.trim() : `/${input.trim()}`;
    setError("");
    try {
      await addMutation.mutateAsync(path);
      setInput("");
      qc.invalidateQueries({ queryKey: ["/api/user/pages"] });
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      qc.invalidateQueries({ queryKey: ["/api/user/pages"] });
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <GlassCard>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Protected Pages</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Specific URL paths to protect on your site.{" "}
          {limit > 0
            ? <span>{pages.length} / {limit} used</span>
            : <span className="text-yellow-400">Not available on your plan.</span>}
        </p>

        {limit > 0 && (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="/signup"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            <ActionButton icon={Plus} variant="ghost" loading={addMutation.isPending} disabled={!input.trim()} onClick={handleAdd} />
          </div>
        )}

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        {pagesQuery.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : pages.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={plan === "FREE" ? "Upgrade your plan to add pages." : "No pages added yet."}
          />
        ) : (
          <ul className="space-y-2">
            {pages.map((p: UserPage) => (
              <li key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-sm font-mono text-foreground">{p.path}</span>
                <ActionButton icon={X} variant="danger" onClick={() => handleDelete(p.id)} title="Remove page" />
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </motion.div>
  );
}

function FreeEmailCheckPanel() {
  const qc = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["/api/user/settings"],
    queryFn: async () => {
      const res = await axiosSecure.get("/api/user/settings");
      return res.data as { blockFreeEmails: boolean };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (blockFreeEmails: boolean) => {
      const res = await axiosSecure.patch("/api/user/settings", { blockFreeEmails });
      return res.data as { blockFreeEmails: boolean };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/user/settings"] }),
  });

  const enabled = settingsQuery.data?.blockFreeEmails ?? false;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <GlassCard>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Free Email Check</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          When enabled, free email providers like Gmail, Yahoo, and Outlook are also flagged as not allowed — not just disposable addresses.
        </p>

        {settingsQuery.isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 transition-all hover:border-primary/20">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${enabled ? "bg-primary/10" : "bg-muted"}`}>
                  <Shield className={`h-5 w-5 ${enabled ? "text-primary" : "text-muted-foreground/40"}`} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Block Free Providers</h4>
                  <p className="text-[10px] text-muted-foreground">Applies to API and Script integrations</p>
                </div>
              </div>
              <button
                onClick={() => updateMutation.mutate(!enabled)}
                disabled={updateMutation.isPending}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {enabled && (
              <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Currently Flagged Domains</p>
                <div className="flex flex-wrap gap-1.5">
                  {FREE_EMAIL_DOMAINS.map((domain) => (
                    <span key={domain} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20">
                      {domain}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {updateMutation.isError && (
          <p className="text-xs text-red-400 mt-3">Failed to save. Please try again.</p>
        )}
      </GlassCard>
    </motion.div>
  );
}

function EmbedScriptPanel({ apiKey }: { apiKey?: string }) {
  const [copied, setCopied] = React.useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://leadcop.io";
  const scriptTag = `<script src="${origin}/temp-email-validator.js" data-api-key="${apiKey ?? 'YOUR_API_KEY'}"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <GlassCard>
        <div className="flex items-center gap-2 mb-1">
          <Code className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Embed Script</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Drop this snippet into your HTML to enable client-side disposable email detection on your forms.
        </p>
        <div className="flex gap-2 items-start">
          <pre className="flex-1 rounded-xl bg-muted/50 border border-border px-4 py-3 font-mono text-xs text-foreground/80 overflow-x-auto whitespace-pre-wrap break-all">
            {scriptTag}
          </pre>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-3 rounded-xl border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function WordPressPluginPanel() {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <GlassCard>
        <div className="flex items-center gap-2 mb-1">
          <Download className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">WordPress Plugin</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Protect your WordPress forms with server-side disposable email detection. Supports WooCommerce, Contact Form 7, WPForms, and Gravity Forms — no coding required.
        </p>
        <div className="space-y-3 mb-5">
          {[
            "WordPress registration & comment forms",
            "WooCommerce checkout & My Account",
            "Contact Form 7 · WPForms · Gravity Forms",
            "Fail-open: forms work even if API is unreachable",
          ].map(feature => (
            <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              {feature}
            </div>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap">
          <a
            href="/downloads/leadcop-email-validator.zip"
            download
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download Plugin
          </a>
          <Link
            href="/docs#wordpress"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <FileText className="h-4 w-4" />
            Setup Guide
          </Link>
        </div>
        <p className="text-[10px] text-muted-foreground mt-4">
          Version 1.1.0 · Requires WordPress 5.8+ and PHP 7.4+
        </p>
      </GlassCard>
    </motion.div>
  );
}

export default function SettingsTab({ planConfig, plan, apiKey }: { planConfig?: DashboardPlanConfig; plan: string; apiKey?: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <WebsitesPanel planConfig={planConfig} plan={plan} />
      <PagesPanel planConfig={planConfig} plan={plan} />
      <FreeEmailCheckPanel />
      <EmbedScriptPanel apiKey={apiKey} />
      <WordPressPluginPanel />
    </div>
  );
}
