import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { Navbar, Footer, PageTransition } from "@/components/Layout";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface PlanData {
  plan: string;
  price: number;
  requestLimit: number;
  websiteLimit: number;
  mxDetectionEnabled: boolean;
  inboxCheckEnabled: boolean;
}

const PLAN_META: Record<string, {
  period: string;
  desc: string;
  staticFeatures: string[];
  cta: string;
  href: string;
  highlighted: boolean;
}> = {
  FREE: {
    period: "forever",
    desc: "Perfect for testing and small projects",
    staticFeatures: ["Basic email detection", "Standard response time", "Community support"],
    cta: "Get Started Free",
    href: "/signup",
    highlighted: false,
  },
  BASIC: {
    period: "/month",
    desc: "For growing applications and startups",
    staticFeatures: ["Priority response time", "Usage analytics dashboard", "Email support", "Monthly reset"],
    cta: "Upgrade to Basic",
    href: "/upgrade",
    highlighted: false,
  },
  PRO: {
    period: "/month",
    desc: "For production workloads at scale",
    staticFeatures: ["Fastest response time", "Advanced analytics", "Priority support", "Monthly reset", "Custom integrations"],
    cta: "Upgrade to Pro",
    href: "/upgrade",
    highlighted: true,
  },
};

function formatPrice(plan: string, price: number): string {
  if (plan === "FREE") return "$0";
  return `$${price % 1 === 0 ? price : price.toFixed(2)}`;
}

function buildFeatures(planKey: string, data: PlanData): string[] {
  const features: string[] = [];
  const isFree = planKey === "FREE";

  if (data.requestLimit > 0) {
    features.push(
      isFree
        ? `${data.requestLimit.toLocaleString()} requests total`
        : `${data.requestLimit.toLocaleString()} requests/month`
    );
  }

  if (!isFree && data.websiteLimit > 0) {
    features.push(`${data.websiteLimit} website${data.websiteLimit > 1 ? "s" : ""}`);
  }

  if (data.mxDetectionEnabled) features.push("MX record verification");
  if (data.inboxCheckEnabled) features.push("Inbox detection");

  return [...features, ...(PLAN_META[planKey]?.staticFeatures ?? [])];
}

function usePlanData() {
  const [plans, setPlans] = useState<PlanData[]>([]);

  useEffect(() => {
    fetch("/api/settings/plans")
      .then(r => r.json())
      .then((data: { plans: PlanData[] }) => setPlans(data.plans))
      .catch(() => {});
  }, []);

  return plans;
}

export default function PricingPage() {
  const planData = usePlanData();

  const plans = ["FREE", "BASIC", "PRO"]
    .map(key => {
      const meta = PLAN_META[key];
      if (!meta) return null;
      const data = planData.find(p => p.plan === key);
      const defaults: PlanData = {
        plan: key,
        price: key === "FREE" ? 0 : key === "BASIC" ? 9 : 29,
        requestLimit: key === "FREE" ? 10 : key === "BASIC" ? 1000 : 10000,
        websiteLimit: 0,
        mxDetectionEnabled: false,
        inboxCheckEnabled: false,
      };
      const resolved = data ?? defaults;
      return {
        key,
        name: key.charAt(0) + key.slice(1).toLowerCase(),
        price: formatPrice(key, resolved.price),
        period: meta.period,
        desc: meta.desc,
        features: buildFeatures(key, resolved),
        cta: meta.cta,
        href: meta.href,
        highlighted: meta.highlighted,
      };
    })
    .filter(Boolean) as NonNullable<ReturnType<typeof plans[0]>>[];

  return (
    <>
      <Navbar />
      <PageTransition>
        <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-16 flex flex-col items-center">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="font-heading text-4xl font-bold text-foreground mb-4 md:text-5xl">
              Simple, Transparent Pricing
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Start free. Scale as you grow. No hidden fees, no surprises.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`glass-card relative flex flex-col rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] ${
                  plan.highlighted ? "glow-primary" : ""
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-heading text-lg font-semibold text-foreground">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-heading text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`inline-flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 text-sm text-muted-foreground text-center"
          >
            Need more volume?{" "}
            <Link href="/upgrade" className="text-primary underline underline-offset-2 hover:text-primary/80">
              Request a custom plan
            </Link>
            {" "}— we'll work with you.
          </motion.p>

        </main>
      </PageTransition>
      <Footer />
    </>
  );
}
