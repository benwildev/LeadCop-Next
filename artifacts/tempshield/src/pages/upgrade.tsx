import React, { useState, useEffect } from "react";
import { Navbar, PageTransition } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useRequestUpgrade } from "@workspace/api-client-react";
import { CheckCircle2, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

interface ActiveGateway {
  gateway: "MANUAL" | "STRIPE" | "PAYPAL";
  stripePublishableKey: string | null;
  paypalClientId: string | null;
  paypalMode: "sandbox" | "live";
  planPrices: Record<string, number>;
}

function useActiveGateway() {
  const [data, setData] = useState<ActiveGateway | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/active-gateway")
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ gateway: "MANUAL", stripePublishableKey: null, paypalClientId: null, paypalMode: "sandbox", planPrices: { BASIC: 9, PRO: 29 } }))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

function PlanCards({
  selected,
  onSelect,
  prices,
  limits,
}: {
  selected: "BASIC" | "PRO";
  onSelect: (p: "BASIC" | "PRO") => void;
  prices: Record<string, number>;
  limits: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      {(["BASIC", "PRO"] as const).map(plan => (
        <button
          key={plan}
          type="button"
          onClick={() => onSelect(plan)}
          className={`p-6 rounded-2xl border-2 cursor-pointer transition-all text-left ${
            selected === plan
              ? "border-primary bg-primary/10"
              : "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/30"
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-foreground">{plan}</h3>
            {selected === plan && <CheckCircle2 className="w-5 h-5 text-primary" />}
          </div>
          <div className="text-2xl font-bold text-foreground mb-1">
            ${prices[plan] ?? (plan === "BASIC" ? 9 : 29)}
            <span className="text-sm text-muted-foreground font-normal">/mo</span>
          </div>
          <p className="text-sm text-muted-foreground">{limits[plan]}</p>
        </button>
      ))}
    </div>
  );
}

function ManualUpgrade({ planPrices }: { planPrices: Record<string, number> }) {
  const upgradeMutation = useRequestUpgrade();
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<"BASIC" | "PRO">("BASIC");
  const [note, setNote] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upgradeMutation.mutateAsync({ data: { plan: selectedPlan, note } });
      setSuccess(true);
      setTimeout(() => setLocation("/dashboard"), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  if (success) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Request Submitted</h2>
        <p className="text-muted-foreground mb-4">Our team will review your upgrade request and contact you shortly.</p>
        <p className="text-sm text-muted-foreground/60">Redirecting to dashboard...</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PlanCards selected={selectedPlan} onSelect={setSelectedPlan} prices={planPrices} limits={{ BASIC: "1,000 requests", PRO: "10,000 requests" }} />
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Optional Note for Sales</label>
        <textarea
          rows={3}
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-muted/60 transition-all resize-none"
          placeholder="Any specific requirements or expected volume?"
        />
      </div>
      <button
        type="submit"
        disabled={upgradeMutation.isPending}
        className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:bg-primary/90 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {upgradeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Submit Request</span><ArrowRight className="w-4 h-4" /></>}
      </button>
    </form>
  );
}

function StripeUpgrade({ planPrices }: { planPrices: Record<string, number> }) {
  const [selectedPlan, setSelectedPlan] = useState<"BASIC" | "PRO">("BASIC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      const resp = await fetch("/api/user/checkout/stripe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          successUrl: `${origin}${base}/upgrade/success`,
          cancelUrl: `${origin}${base}/upgrade`,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Checkout failed");
      if (data.sessionUrl) window.location.href = data.sessionUrl;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PlanCards selected={selectedPlan} onSelect={setSelectedPlan} prices={planPrices} limits={{ BASIC: "1,000 requests", PRO: "10,000 requests" }} />
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:bg-primary/90 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Pay with Stripe</span><ArrowRight className="w-4 h-4" /></>}
      </button>
      <p className="text-xs text-center text-muted-foreground">You will be redirected to Stripe Checkout to complete payment.</p>
    </div>
  );
}

function PayPalUpgrade({ clientId, mode, planPrices }: { clientId: string; mode: string; planPrices: Record<string, number> }) {
  const [selectedPlan, setSelectedPlan] = useState<"BASIC" | "PRO">("BASIC");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  if (success) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h2>
        <p className="text-muted-foreground mb-4">Your plan has been upgraded to {selectedPlan}.</p>
        <p className="text-sm text-muted-foreground/60">Redirecting to dashboard...</p>
      </motion.div>
    );
  }

  return (
    <PayPalScriptProvider options={{ clientId, currency: "USD", intent: "capture", ...(mode === "sandbox" ? { "buyer-country": "US" } : {}) }}>
      <div className="space-y-6">
        <PlanCards selected={selectedPlan} onSelect={setSelectedPlan} prices={planPrices} limits={{ BASIC: "1,000 requests", PRO: "10,000 requests" }} />
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        <div className="paypal-button-container">
          <PayPalButtons
            style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay" }}
            createOrder={async () => {
              const resp = await fetch("/api/user/checkout/paypal/create-order", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: selectedPlan }),
              });
              const data = await resp.json();
              if (!resp.ok || !data.orderId) throw new Error(data.error || "Failed to create order");
              return data.orderId;
            }}
            onApprove={async (data) => {
              const resp = await fetch("/api/user/checkout/paypal/capture-order", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: data.orderID }),
              });
              const result = await resp.json();
              if (!resp.ok) throw new Error(result.error || "Capture failed");
              setSuccess(true);
              setTimeout(() => setLocation("/dashboard"), 3000);
            }}
            onError={(err) => {
              console.error("PayPal error", err);
              setError("PayPal payment failed. Please try again.");
            }}
          />
        </div>
        <p className="text-xs text-center text-muted-foreground">
          {mode === "sandbox" ? "⚠ PayPal Sandbox mode — no real charges." : "Powered by PayPal."}
        </p>
      </div>
    </PayPalScriptProvider>
  );
}

function StripeSuccessPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => setLocation("/dashboard"), 4000);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-8 rounded-3xl text-center max-w-md w-full">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h2>
        <p className="text-muted-foreground mb-4">Your plan upgrade is being processed. It may take a few moments to reflect.</p>
        <p className="text-sm text-muted-foreground/60">Redirecting to dashboard...</p>
      </motion.div>
    </div>
  );
}

export default function UpgradePage() {
  const { user } = useAuth();
  const { data: gateway, loading } = useActiveGateway();
  const [location] = useLocation();

  if (!user) return null;

  if (location === "/upgrade/success") {
    return <StripeSuccessPage />;
  }

  if (loading || !gateway) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 rounded-3xl">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">Upgrade Plan</h1>
            <p className="text-muted-foreground mb-8">Select a plan to increase your rate limits and unlock premium features.</p>

            {gateway.gateway === "MANUAL" && (
              <ManualUpgrade planPrices={gateway.planPrices} />
            )}
            {gateway.gateway === "STRIPE" && (
              <StripeUpgrade planPrices={gateway.planPrices} />
            )}
            {gateway.gateway === "PAYPAL" && gateway.paypalClientId && (
              <PayPalUpgrade
                clientId={gateway.paypalClientId}
                mode={gateway.paypalMode}
                planPrices={gateway.planPrices}
              />
            )}
            {gateway.gateway === "PAYPAL" && !gateway.paypalClientId && (
              <div className="flex items-center gap-2 text-yellow-400 text-sm bg-yellow-500/10 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" /> PayPal is not fully configured. Please contact support.
              </div>
            )}
          </motion.div>
        </div>
      </PageTransition>
    </div>
  );
}
