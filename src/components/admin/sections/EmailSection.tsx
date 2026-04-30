import React, { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { Loader2, Check, X, Lock, Mail, Send } from "lucide-react";
import { SectionHeader, GlassCard, ActionButton, PageHeader } from "@/components/shared";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosSecure } from "@/lib/api-client-react";

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

const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
      value ? "bg-primary" : "bg-muted-foreground/30"
    }`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        value ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

export function EmailSection() {
  const qc = useQueryClient();
  const { data, isLoading: loading } = useQuery<EmailSettingsData>({
    queryKey: ["/api/admin/email-settings"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/admin/email-settings");
      return response.data;
    },
  });

  const [form, setForm] = useState<EmailSettingsData | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const initialised = useRef(false);

  useEffect(() => {
    if (data && !initialised.current) {
      initialised.current = true;
      setForm(data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: EmailSettingsData) => {
      const response = await axiosSecure.post("/api/admin/email-settings", payload);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/email-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await axiosSecure.post("/api/admin/email-settings/test", { email });
      return response.data;
    },
  });

  const handleSave = () => {
    if (form) saveMutation.mutate(form);
  };

  const handleTestEmail = () => {
    if (testEmail) testEmailMutation.mutate(testEmail);
  };

  const set = <K extends keyof EmailSettingsData>(
    k: K,
    v: EmailSettingsData[K],
  ) => {
    if (form) setForm((f) => (f ? { ...f, [k]: v } : null));
  };

  if (loading || !form) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const testResult = testEmailMutation.data;
  const testing = testEmailMutation.isPending;
  const saving = saveMutation.isPending;
  const saveError = saveMutation.error ? (saveMutation.error as any).message : null;

  return (
    <div className="max-w-4xl pb-12">
      <SectionHeader
        title="Email Settings"
        subtitle="Configure SMTP credentials and notification preferences"
      />

      <GlassCard rounded="rounded-xl" className="mb-6">
        <div className="flex items-center gap-4 mb-8">
          <Toggle value={form.enabled} onChange={() => set("enabled", !form.enabled)} />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Enable System Emails
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Turn off to pause all outgoing emails (newsletter, support, etc.)
            </p>
          </div>
          <div className="ml-auto">
            {form.connectionStatus === "ready" ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
                <Check className="w-3 h-3" /> Ready
              </span>
            ) : form.connectionStatus === "configured" ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-500/20">
                Not Configured
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              SMTP Credentials
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                SMTP Host
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={form.smtpHost || ""}
                  onChange={(e) => set("smtpHost", e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full bg-background/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Port
                </label>
                <input
                  type="number"
                  value={form.smtpPort}
                  onChange={(e) => set("smtpPort", parseInt(e.target.value))}
                  className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <Toggle
                  value={form.smtpSecure}
                  onChange={() => set("smtpSecure", !form.smtpSecure)}
                />
                <span className="text-sm text-muted-foreground">SSL/TLS</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Username
              </label>
              <input
                type="text"
                value={form.smtpUser || ""}
                onChange={(e) => set("smtpUser", e.target.value)}
                className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={form.smtpPass || ""}
                  onChange={(e) => set("smtpPass", e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Sender Details
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                From Name
              </label>
              <input
                type="text"
                value={form.fromName}
                onChange={(e) => set("fromName", e.target.value)}
                placeholder="LeadCop Team"
                className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                From Email
              </label>
              <input
                type="email"
                value={form.fromEmail || ""}
                onChange={(e) => set("fromEmail", e.target.value)}
                placeholder="no-reply@leadcop.io"
                className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5 pt-2">
              <label className="text-sm font-medium text-foreground">
                Admin Notification Email
              </label>
              <input
                type="email"
                value={form.adminEmail || ""}
                onChange={(e) => set("adminEmail", e.target.value)}
                placeholder="admin@leadcop.io"
                className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Where to send system alerts and new ticket notifications.
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard rounded="rounded-xl" className="mb-8">
        <PageHeader
          title="Notification Preferences"
          description="Control which events trigger an automated email to admins or users."
        />
        <div className="space-y-5">
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
