import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { Loader2, Check, X, Lock, Shield } from "lucide-react";
import { SectionHeader, StatusBadge } from "@/components/shared";

type PaymentGateway = "MANUAL" | "STRIPE" | "PAYPAL";

interface GatewayStatus {
  enabled: boolean;
  status: "ready" | "partial" | "unconfigured";
  message: string;
}

interface ConnectionStatus {
  manual: GatewayStatus;
  stripe: GatewayStatus;
  paypal: GatewayStatus;
}

interface PaymentSettingsData {
  gateway: PaymentGateway;
  stripeEnabled: boolean;
  stripePublishableKey: string | null;
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  paypalEnabled: boolean;
  paypalClientId: string | null;
  paypalSecret: string | null;
  paypalMode: "sandbox" | "live";
  planPrices: Record<string, number>;
  freeVerifyLimit: number;
  updatedAt?: string;
  connectionStatus?: ConnectionStatus;
}

function useAdminPaymentSettings() {
  const [data, setData] = useState<PaymentSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/admin/payment-settings", {
        credentials: "include",
      });
      if (!resp.ok) throw new Error("Failed to load");
      setData(await resp.json());
    } catch {
      setError("Failed to load payment settings");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

type GatewayStatusKey = "ready" | "partial" | "unconfigured";

const STATUS_VARIANT: Record<GatewayStatusKey, "success" | "warning" | "muted"> = {
  ready: "success",
  partial: "warning",
  unconfigured: "muted",
};

const STATUS_LABEL: Record<GatewayStatusKey, string> = {
  ready: "Ready",
  partial: "Partial",
  unconfigured: "Not configured",
};

function GatewayStatusBadge({
  status,
  message,
}: {
  status: GatewayStatusKey;
  message: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <StatusBadge label={STATUS_LABEL[status]} variant={STATUS_VARIANT[status]} />
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
    </div>
  );
}

export function PaymentSection() {
  const { data, loading, error, refetch } = useAdminPaymentSettings();
  const [form, setForm] = useState<Partial<PaymentSettingsData> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  React.useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  const set = (key: keyof PaymentSettingsData, value: unknown) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const resp = await fetch("/api/admin/payment-settings", {
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

  const gateway = form.gateway || "MANUAL";
  const cs = data?.connectionStatus;

  return (
    <div>
      <SectionHeader
        title="Payment Gateway"
        subtitle="Configure how users pay for upgrades"
      />

      {cs && (
        <div className="glass-card rounded-xl p-6 mb-4">
          <h3 className="font-heading text-sm font-semibold text-foreground mb-4">
            Connection Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Manual Approval
              </span>
              <GatewayStatusBadge
                status={cs.manual.status}
                message={cs.manual.message}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  Stripe
                </span>
                <button
                  onClick={() => set("stripeEnabled", !form.stripeEnabled)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    form.stripeEnabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      form.stripeEnabled ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <GatewayStatusBadge
                status={cs.stripe.status}
                message={cs.stripe.message}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  PayPal
                </span>
                <button
                  onClick={() => set("paypalEnabled", !form.paypalEnabled)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    form.paypalEnabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      form.paypalEnabled ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <GatewayStatusBadge
                status={cs.paypal.status}
                message={cs.paypal.message}
              />
            </div>
          </div>
        </div>
      )}

      <div className="glass-card rounded-xl p-6 mb-4">
        <h3 className="font-heading text-sm font-semibold text-foreground mb-1">
          Active Gateway
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Which gateway processes payments on the upgrade page
        </p>
        <div className="flex gap-3 flex-wrap">
          {(["MANUAL", "STRIPE", "PAYPAL"] as const).map((gw) => (
            <button
              key={gw}
              onClick={() => set("gateway", gw)}
              className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all border ${
                gateway === gw
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {gw === "MANUAL"
                ? "Manual"
                : gw === "STRIPE"
                  ? "Stripe"
                  : "PayPal"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {gateway === "MANUAL" &&
            "Admins manually approve upgrade requests. No payment processing."}
          {gateway === "STRIPE" &&
            "Users pay via Stripe Checkout. Webhooks auto-upgrade the account."}
          {gateway === "PAYPAL" &&
            "Users pay via PayPal. Orders are captured and plan is upgraded instantly."}
        </p>
      </div>

      <div className="glass-card rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Stripe Configuration
          </h3>
          {cs && <GatewayStatusBadge status={cs.stripe.status} message="" />}
        </div>
        <div className="space-y-4">
          {[
            {
              key: "stripePublishableKey",
              label: "Publishable Key",
              placeholder: "pk_live_...",
              type: "text",
            },
            {
              key: "stripeSecretKey",
              label: "Secret Key",
              placeholder: "sk_live_...",
              type: "password",
            },
            {
              key: "stripeWebhookSecret",
              label: "Webhook Secret",
              placeholder: "whsec_...",
              type: "password",
            },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground font-medium block mb-1">
                {label}
              </label>
              <input
                type={type}
                value={(form[key as keyof typeof form] as string) || ""}
                onChange={(e) =>
                  set(key as keyof PaymentSettingsData, e.target.value || null)
                }
                placeholder={placeholder}
                className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Webhook URL:{" "}
            <code className="bg-background/70 px-1.5 py-0.5 rounded text-primary">
              /api/webhooks/stripe
            </code>
          </p>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> PayPal Configuration
          </h3>
          {cs && <GatewayStatusBadge status={cs.paypal.status} message="" />}
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">
              Client ID
            </label>
            <input
              type="text"
              value={(form.paypalClientId as string) || ""}
              onChange={(e) => set("paypalClientId", e.target.value || null)}
              placeholder="AXxxxxxxx..."
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">
              Secret
            </label>
            <input
              type="password"
              value={(form.paypalSecret as string) || ""}
              onChange={(e) => set("paypalSecret", e.target.value || null)}
              placeholder="EJxxxxxxx..."
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">
              Mode
            </label>
            <div className="flex gap-3">
              {(["sandbox", "live"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => set("paypalMode", mode)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    form.paypalMode === mode
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {mode === "sandbox" ? "Sandbox" : "Live"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 mb-4">
        <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-primary" /> Free Email Verifier
        </h3>
        <div>
          <label className="text-xs text-muted-foreground font-medium block mb-1">
            Free checks per session (0 to disable)
          </label>
          <input
            type="number"
            min={0}
            max={1000}
            value={form.freeVerifyLimit ?? 5}
            onChange={(e) =>
              set(
                "freeVerifyLimit",
                Math.max(0, Math.min(1000, parseInt(e.target.value, 10) || 0)),
              )
            }
            className="w-32 bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Controls how many free checks anonymous visitors can run on the{" "}
            <code className="bg-background/70 px-1 py-0.5 rounded text-primary">
              /verify
            </code>{" "}
            page per 24-hour session.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saved && (
          <span className="text-green-400 text-sm font-medium">✓ Saved</span>
        )}
        {saveError && <span className="text-red-400 text-sm">{saveError}</span>}
        {data?.updatedAt && (
          <span className="text-xs text-muted-foreground ml-auto">
            Last updated {format(parseISO(data.updatedAt), "MMM d, yyyy HH:mm")}
          </span>
        )}
      </div>
    </div>
  );
}
