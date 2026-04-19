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
    desc: "Perfect for testing and small personal projects",
    staticFeatures: ["Standard response time", "Basic email detection", "Community support"],
    cta: "Start for Free",
    href: "/signup",
    highlighted: false,
  },
  BASIC: {
    period: "/month",
    desc: "Essential tools for startups and independent developers",
    staticFeatures: ["Priority response time", "Usage dashboard", "Priority email support", "Monthly credit reset"],
    cta: "Get Started",
    href: "/upgrade",
    highlighted: false,
  },
  PRO: {
    period: "/month",
    desc: "The most popular choice for growing platforms",
    staticFeatures: ["Fastest response time", "Advanced API access", "Basic analytics dashboard", "Priority email & chat support"],
    cta: "Get Started",
    href: "/upgrade",
    highlighted: true,
  },
  ADVANCED: {
    period: "/month",
    desc: "Built for scaling businesses with complex needs",
    staticFeatures: ["Bulk verification engine", "Advanced usage analytics", "Custom reporting tools", "Dedicated support manager"],
    cta: "Go Advanced",
    href: "/upgrade",
    highlighted: false,
  },
  MAX: {
    period: "/month",
    desc: "Enterprise-grade volume and performance for agencies",
    staticFeatures: ["Unlimited API endpoints", "Lowest latency verification", "Custom webhook integrations", "24/7 Phone & Email support"],
    cta: "Go Unlimited",
    href: "/upgrade",
    highlighted: false,
  },
};

function formatPrice(plan: string, price: number): string {
  if (price === 0) return "$0";
  return `$${price % 1 === 0 ? price : price.toFixed(2)}`;
}

function buildFeatures(planKey: string, data: PlanData): string[] {
  const features: string[] = [];
  const isFree = data.price === 0;

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

  interface ResolvedPlan {
    key: string;
    name: string;
    price: string;
    period: string;
    desc: string;
    features: string[];
    cta: string;
    href: string;
    highlighted: boolean;
  }

  let plansDataToUse = planData;
  if (planData.length === 0) {
    plansDataToUse = [
      { plan: "FREE", price: 0, requestLimit: 10, websiteLimit: 0, mxDetectionEnabled: false, inboxCheckEnabled: false },
      { plan: "BASIC", price: 9, requestLimit: 1000, websiteLimit: 0, mxDetectionEnabled: false, inboxCheckEnabled: false },
      { plan: "PRO", price: 29, requestLimit: 10000, websiteLimit: 0, mxDetectionEnabled: false, inboxCheckEnabled: false },
    ];
  }

  const plans = plansDataToUse
    .sort((a, b) => a.price - b.price)
    .map(data => {
      const key = data.plan;
      const meta = PLAN_META[key] || {
        period: data.price === 0 ? "forever" : "/month",
        desc: "Advanced protection for your business",
        staticFeatures: ["Priority support"],
        cta: data.price === 0 ? "Start for Free" : "Get Started",
        href: data.price === 0 ? "/signup" : "/upgrade",
        highlighted: false,
      };

      return {
        key,
        name: key.charAt(0) + key.slice(1).toLowerCase(),
        price: formatPrice(key, data.price),
        period: meta.period,
        desc: meta.desc,
        features: buildFeatures(key, data),
        cta: meta.cta,
        href: meta.href,
        highlighted: meta.highlighted,
      } as ResolvedPlan;
    });

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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl mx-auto">
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
