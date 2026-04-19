import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { Loader2, Check, X, Lock, Mail, Send } from "lucide-react";
import { SectionHeader, GlassCard, ActionButton, PageHeader } from "@/components/shared";

interface EmailSettingsData {
  enabled: boolean;
  smtpHost: string | null;
  smtpPort: number;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpSecure: boolean;
  fromName: string;
  fromEmail: string | null;
  notifyOnSubmit: boolean;
  notifyOnDecision: boolean;
  notifyAdminOnNewTicket: boolean;
  notifyUserOnTicketCreated: boolean;
  notifyAdminOnNewSubscriber: boolean;
  notifyUserOnTicketStatusChange: boolean;
  adminEmail: string | null;
  updatedAt?: string;
  connectionStatus: "ready" | "configured" | "unconfigured";
}

function useEmailSettings() {
  const [data, setData] = useState<EmailSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/admin/email-settings", {
        credentials: "include",
      });
      if (!resp.ok) throw new Error("Failed to load");
      setData(await resp.json());
    } catch {
      setError("Failed to load email settings");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refetch();
  }, [refetch]);
  return { data, loading, error, refetch };
}

export function EmailSection() {
  const { data, loading, error, refetch } = useEmailSettings();
  const [form, setForm] = useState<Partial<EmailSettingsData> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  React.useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  const set = (key: keyof EmailSettingsData, value: unknown) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const resp = await fetch("/api/admin/email-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!resp.ok) {
        const body = await resp.json();
        throw new Error(body.error || "Save failed");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      refetch();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await fetch("/api/admin/email-settings/test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const body = await resp.json();
      setTestResult({
        ok: resp.ok,
        msg: body.message || body.error || "Unknown",
      });
    } catch {
      setTestResult({ ok: false, msg: "Request failed" });
    } finally {
      setTesting(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );

  if (error || !form)
    return (
      <div className="flex items-center gap-2 text-red-400">
        <X className="w-4 h-4" /> {error || "No data"}
      </div>
    );

  const statusColors = {
    ready: "bg-green-500/15 text-green-400 border-green-500/30",
    configured: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    unconfigured: "bg-muted/40 text-muted-foreground border-border",
  };
  const statusLabels = {
    ready: "Active",
    configured: "Configured (disabled)",
    unconfigured: "Not configured",
  };
  const cs = data?.connectionStatus || "unconfigured";

  const Toggle = ({
    value,
    onChange,
  }: {
    value: boolean | undefined;
    onChange: () => void;
  }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 mt-0.5 ${
        value ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          value ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );

  return (
    <div>
      <SectionHeader
        title="Email Settings"
        subtitle="Configure SMTP to send upgrade request notifications"
      />

      <GlassCard rounded="rounded-xl" className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Email Notifications
            </p>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold border mt-1 inline-block ${statusColors[cs]}`}
            >
              {statusLabels[cs]}
            </span>
          </div>
        </div>
        <button
          onClick={() => set("enabled", !form.enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            form.enabled ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              form.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </GlassCard>

      <GlassCard rounded="rounded-xl" className="mb-4">
        <PageHeader title="SMTP Configuration" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground font-medium block mb-1">
              SMTP Host
            </label>
            <input
              type="text"
              value={form.smtpHost || ""}
              onChange={(e) => set("smtpHost", e.target.value || null)}
              placeholder="smtp.gmail.com"
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">
              Port
            </label>
            <input
              type="number"
              value={form.smtpPort ?? 587}
              onChange={(e) => set("smtpPort", Number(e.target.value))}
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <button
              onClick={() => set("smtpSecure", !form.smtpSecure)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                form.smtpSecure ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  form.smtpSecure ? "translate-x-4" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-muted-foreground">
              TLS/SSL (port 465)
            </span>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">
              Username
            </label>
            <input
              type="text"
              value={form.smtpUser || ""}
              onChange={(e) => set("smtpUser", e.target.value || null)}
              placeholder="you@gmail.com"
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">
              Password / App Password
            </label>
            <input
              type="password"
              value={form.smtpPass || ""}
              onChange={(e) => set("smtpPass", e.target.value || null)}
              placeholder="••••••••"
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </GlassCard>

      <GlassCard rounded="rounded-xl" className="mb-4">
        <PageHeader title="Sender &amp; Recipients" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">
              From Name
            </label>
            <input
              type="text"
              value={form.fromName || ""}
              onChange={(e) => set("fromName", e.target.value)}
              placeholder="LeadCop"
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">
              From Email
            </label>
            <input
              type="email"
              value={form.fromEmail || ""}
              onChange={(e) => set("fromEmail", e.target.value || null)}
              placeholder="noreply@yourdomain.com"
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground font-medium block mb-1">
              Admin Email (receives new request alerts)
            </label>
            <input
              type="email"
              value={form.adminEmail || ""}
              onChange={(e) => set("adminEmail", e.target.value || null)}
              placeholder="admin@yourdomain.com"
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </GlassCard>

      <GlassCard rounded="rounded-xl" className="mb-4">
        <PageHeader title="Notification Triggers" />
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <Toggle
              value={form.notifyOnSubmit}
              onChange={() => set("notifyOnSubmit", !form.notifyOnSubmit)}
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                On upgrade request submitted
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sends a confirmation to the user and an alert to the admin
                email.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Toggle
              value={form.notifyOnDecision}
              onChange={() => set("notifyOnDecision", !form.notifyOnDecision)}
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                On upgrade approved / rejected
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sends the user an email when their request is approved or
                rejected.
              </p>
            </div>
          </div>
          <div className="border-t border-border/50 pt-4 mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Support Tickets
            </p>
          </div>
          <div className="flex items-start gap-4">
            <Toggle
              value={form.notifyAdminOnNewTicket}
              onChange={() =>
                set("notifyAdminOnNewTicket", !form.notifyAdminOnNewTicket)
              }
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                Notify admin on new support ticket
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sends the admin email an alert whenever a user opens a new
                support ticket.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Toggle
              value={form.notifyUserOnTicketCreated}
              onChange={() =>
                set(
                  "notifyUserOnTicketCreated",
                  !form.notifyUserOnTicketCreated,
                )
              }
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                Notify user on ticket created
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sends the user a confirmation email when their support ticket is
                successfully created.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Toggle
              value={form.notifyUserOnTicketStatusChange}
              onChange={() =>
                set(
                  "notifyUserOnTicketStatusChange",
                  !form.notifyUserOnTicketStatusChange,
                )
              }
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                Notify user on ticket status change
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sends the user an email when an admin changes the status of
                their support ticket.
              </p>
            </div>
          </div>
          <div className="border-t border-border/50 pt-4 mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Newsletter
            </p>
          </div>
          <div className="flex items-start gap-4">
            <Toggle
              value={form.notifyAdminOnNewSubscriber}
              onChange={() =>
                set(
                  "notifyAdminOnNewSubscriber",
                  !form.notifyAdminOnNewSubscriber,
                )
              }
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                Notify admin on new newsletter subscriber
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sends the admin email an alert whenever someone subscribes to
                the newsletter.
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="flex items-center gap-3 mb-6">
        <ActionButton
          icon={saved ? Check : undefined}
          variant="primary"
          loading={saving}
          onClick={handleSave}
        >
          {saved ? "Saved!" : "Save Settings"}
        </ActionButton>
        {saveError && <span className="text-red-400 text-sm">{saveError}</span>}
        {data?.updatedAt && (
          <span className="text-xs text-muted-foreground ml-auto">
            Last updated {format(parseISO(data.updatedAt), "MMM d, yyyy HH:mm")}
          </span>
        )}
      </div>

      <GlassCard rounded="rounded-xl">
        <PageHeader
          title="Send Test Email"
          description="Verify your SMTP settings by sending a test email. The connection is established live."
        />
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <ActionButton
            icon={testing ? undefined : Send}
            variant="outline"
            loading={testing}
            onClick={handleTestEmail}
          >
            {testing ? "Sending…" : "Send"}
          </ActionButton>
        </div>
        {testResult && (
          <p
            className={`text-xs mt-3 font-medium ${testResult.ok ? "text-green-400" : "text-red-400"}`}
          >
            {testResult.ok ? "✓" : "✗"} {testResult.msg}
          </p>
        )}
      </GlassCard>
    </div>
  );
}
