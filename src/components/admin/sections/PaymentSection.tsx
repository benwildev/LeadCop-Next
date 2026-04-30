import React, { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { Loader2, Check, Lock, DollarSign, Shield } from "lucide-react";
import { SectionHeader, ActionButton } from "@/components/shared";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosSecure } from "@/lib/api-client-react";

interface PaymentSettingsData {
  stripePublishableKey: string | null;
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  paypalClientId: string | null;
  paypalSecret: string | null;
  paypalMode: "sandbox" | "live";
  currency: string;
  activeGateway: "stripe" | "paypal" | "both";
  freeVerifyLimit: number | null;
  updatedAt?: string;
}

interface ConnectionStatus {
  stripe: { status: "ready" | "error" | "unconfigured" };
  paypal: { status: "ready" | "error" | "unconfigured" };
}

function GatewayStatusBadge({
  status,
  message,
}: {
  status: "ready" | "error" | "unconfigured";
  message: string;
}) {
  if (status === "ready")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
        Ready
      </span>
    );
  if (status === "unconfigured")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/20 px-2 py-0.5 rounded-full border border-border">
        Not Setup
      </span>
    );
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20"
      title={message}
    >
      Error
    </span>
  );
}

export function PaymentSection() {
  const qc = useQueryClient();
  
  const { data, isLoading: loading } = useQuery<PaymentSettingsData>({
    queryKey: ["/api/admin/payment-settings"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/admin/payment-settings");
      return response.data;
    },
  });

  const { data: cs } = useQuery<ConnectionStatus>({
    queryKey: ["/api/admin/payment-settings/status"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/admin/payment-settings/status");
      return response.data;
    },
  });

  const [form, setForm] = useState<PaymentSettingsData | null>(null);
  const [saved, setSaved] = useState(false);
  const initialised = useRef(false);

  useEffect(() => {
    if (data && !initialised.current) {
      initialised.current = true;
      setForm(data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: PaymentSettingsData) => {
      const response = await axiosSecure.post("/api/admin/payment-settings", payload);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/payment-settings"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/payment-settings/status"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    if (form) saveMutation.mutate(form);
  };

  const set = <K extends keyof PaymentSettingsData>(
    k: K,
    v: PaymentSettingsData[K],
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

  const saving = saveMutation.isPending;
  const saveError = saveMutation.error ? (saveMutation.error as any).message : null;

  return (
    <div className="max-w-4xl pb-12">
      <SectionHeader
        title="Payment & Gateway"
        subtitle="Configure billing providers, API keys and usage limits"
      />

      <div className="glass-card rounded-xl p-6 mb-4">
        <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-primary" /> General Settings
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">
              Primary Currency
            </label>
            <select
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="AUD">AUD ($)</option>
              <option value="CAD">CAD ($)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">
              Active Payment Methods
            </label>
            <select
              value={form.activeGateway}
              onChange={(e) =>
                set("activeGateway", e.target.value as PaymentSettingsData["activeGateway"])
              }
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="stripe">Stripe Only</option>
              <option value="paypal">PayPal Only</option>
              <option value="both">Stripe & PayPal</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Stripe Configuration
          </h3>
          {cs && <GatewayStatusBadge status={cs.stripe.status} message="" />}
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">
              Publishable Key
            </label>
            <input
              type="text"
              value={(form.stripePublishableKey as string) || ""}
              onChange={(e) =>
                set("stripePublishableKey", e.target.value || null)
              }
              placeholder="pk_live_..."
              className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">
                Secret Key
              </label>
              <input
                type="password"
                value={(form.stripeSecretKey as string) || ""}
                onChange={(e) => set("stripeSecretKey", e.target.value || null)}
                placeholder="sk_live_..."
                className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">
                Webhook Secret
              </label>
              <input
                type="password"
                value={(form.stripeWebhookSecret as string) || ""}
                onChange={(e) =>
                  set("stripeWebhookSecret", e.target.value || null)
                }
                placeholder="whsec_..."
                className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
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
    </div>
  );
}
