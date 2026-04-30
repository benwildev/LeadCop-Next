"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useRequestUpgrade } from "@/lib/api-client-react";
import { CheckCircle2, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import Layout from "@/components/layout/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { axiosSecure } from "@/lib/api-client-react";

interface ActiveGateway {
  gateway: "MANUAL" | "STRIPE" | "PAYPAL";
  stripePublishableKey: string | null;
  paypalClientId: string | null;
  paypalMode: "sandbox" | "live";
  planPrices: Record<string, number>;
}

interface PlanConfig {
  plan: string;
  description: string | null;
  price: string;
  requestLimit: number;
  features: string[];
}

interface PlanCardsProps {
  selected: string;
  onSelect: (planName: string) => void;
  plans: PlanConfig[];
}

function PlanCards(props: PlanCardsProps) {
  const { selected, onSelect, plans } = props;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      {plans.filter(p => p.plan !== "FREE").map(p => {
        const isEnterprise = p.plan === "ENTERPRISE" || p.plan === "CUSTOM";
        const displayName = isEnterprise ? "CUSTOM" : p.plan;
        const displayPrice = isEnterprise ? "Custom Pricing" : `$${parseFloat(p.price).toLocaleString()}`;
        
        return (
          <button
            key={p.plan}
            type="button"
            onClick={() => onSelect(p.plan)}
            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all text-left relative overflow-hidden flex flex-col h-full ${
              selected === p.plan
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-muted/20 hover:border-primary/30 hover:bg-muted/40"
            }`}
          >
            <div className="flex-1">
              <h4 className="font-heading font-bold text-foreground text-base mb-1">{displayName}</h4>
              <p className="text-2xl font-bold text-foreground mb-3">{displayPrice}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
            </div>
            {selected === p.plan && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ManualUpgrade({ plans }: { plans: PlanConfig[] }) {
  const router = useRouter();
  const upgradeMutation = useRequestUpgrade();
  const [selectedPlan, setSelectedPlan] = useState<string>("BASIC");
  const [note, setNote] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upgradeMutation.mutateAsync({ data: { plan: selectedPlan as any, note } });
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 3000);
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
      <PlanCards selected={selectedPlan} onSelect={setSelectedPlan} plans={plans} />
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

function StripeUpgrade({ plans }: { plans: PlanConfig[] }) {
  const [selectedPlan, setSelectedPlan] = useState<string>("BASIC");
  const [error, setError] = useState<string | null>(null);

  const stripeMutation = useMutation({
    mutationFn: async (plan: string) => {
      const origin = window.location.origin;
      const resp = await axiosSecure.post("/api/user/checkout/stripe", {
        plan: plan as any,
        successUrl: `${origin}/upgrade/success`,
        cancelUrl: `${origin}/upgrade`,
      });
      return resp.data;
    },
    onSuccess: (data) => {
      if (data.sessionUrl) window.location.href = data.sessionUrl;
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || "Checkout failed");
    }
  });

  const handleCheckout = () => {
    setError(null);
    stripeMutation.mutate(selectedPlan);
  };

  return (
    <div className="space-y-6">
      <PlanCards selected={selectedPlan} onSelect={setSelectedPlan} plans={plans} />
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      <button
        onClick={handleCheckout}
        disabled={stripeMutation.isPending}
        className="w-full py-4 bg-[#635BFF] text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/20 hover:opacity-90 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
      >
        {stripeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Pay with Stripe</span><ArrowRight className="w-4 h-4" /></>}
      </button>
      <p className="text-xs text-center text-muted-foreground">You will be redirected to Stripe Checkout to complete payment.</p>
    </div>
  );
}

function PayPalUpgrade({ clientId, mode, plans }: { clientId: string; mode: string; plans: PlanConfig[] }) {
  const [selectedPlan, setSelectedPlan] = useState<string>("BASIC");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
        <PlanCards selected={selectedPlan} onSelect={setSelectedPlan} plans={plans} />
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        <div className="paypal-button-container">
          <PayPalButtons
            style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay" }}
            createOrder={async () => {
              const resp = await axiosSecure.post("/api/user/checkout/paypal/create-order", { plan: selectedPlan as any });
              const data = resp.data;
              if (!data.orderId) throw new Error(data.error || "Failed to create order");
              return data.orderId;
            }}
            onApprove={async (data) => {
              const resp = await axiosSecure.post("/api/user/checkout/paypal/capture-order", { orderId: data.orderID });
              const result = resp.data;
              setSuccess(true);
              setTimeout(() => router.push("/dashboard"), 3000);
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

export default function UpgradePage() {
  const { user } = useAuth();
  
  const { data: gateway, isLoading: gatewayLoading } = useQuery<ActiveGateway>({
    queryKey: ["/api/settings/active-gateway"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/settings/active-gateway");
      return response.data;
    },
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery<PlanConfig[]>({
    queryKey: ["/api/plans"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/plans");
      return response.data.plans || [];
    },
  });

  if (!user) return null;

  if (gatewayLoading || plansLoading || !gateway) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-32">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 rounded-3xl">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Upgrade Plan</h1>
          <p className="text-muted-foreground mb-8">Select a plan to increase your rate limits and unlock premium features.</p>

          {gateway.gateway === "MANUAL" && (
            <ManualUpgrade plans={plans} />
          )}
          {gateway.gateway === "STRIPE" && (
            <StripeUpgrade plans={plans} />
          )}
          {gateway.gateway === "PAYPAL" && gateway.paypalClientId && (
            <PayPalUpgrade
              clientId={gateway.paypalClientId}
              mode={gateway.paypalMode}
              plans={plans}
            />
          )}
          {gateway.gateway === "PAYPAL" && !gateway.paypalClientId && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm bg-yellow-500/10 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" /> PayPal is not fully configured. Please contact support.
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
