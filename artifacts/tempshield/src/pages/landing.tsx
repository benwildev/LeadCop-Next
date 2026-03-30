import React, { useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { Navbar, Footer } from "@/components/Layout";
import {
  Shield,
  Zap,
  Lock,
  Code2,
  Globe,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isValidEmail, extractDomain, KNOWN_DISPOSABLE_DOMAINS as KNOWN_DISPOSABLE } from "@/utils/email-validation";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
};

const STATS = [
  { value: "100K+", label: "Domains" },
  { value: "99.9%", label: "Accuracy" },
  { value: "<50ms", label: "Response" },
  { value: "10K+", label: "Developers" },
];

const FEATURES = [
  {
    icon: Shield,
    title: "Real-time Detection",
    desc: "Instant verification against 5,000+ disposable domains with sub-millisecond lookups.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    desc: "In-memory cache delivers response times under 5ms. No DNS lookups, no external calls.",
  },
  {
    icon: Code2,
    title: "Developer First",
    desc: "RESTful API with examples for cURL, JavaScript, Python, Laravel, and more.",
  },
  {
    icon: Lock,
    title: "Enterprise Security",
    desc: "Encrypted in transit. API key authentication with rate limiting per plan.",
  },
  {
    icon: BarChart3,
    title: "Usage Analytics",
    desc: "Real-time dashboard with detailed request logs and monthly usage breakdowns.",
  },
];

const SCRIPT_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/temp-email-validator.js`
    : "https://yourdomain.com/temp-email-validator.js";

const API_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/api/check-email`
    : "https://yourdomain.com/api/check-email";

const CODE_TABS = [
  {
    id: "html",
    label: "HTML Script",
    icon: "🌐",
    code: `<!-- Add this just before the closing </body> tag -->
<script
  src="${SCRIPT_URL}"
  data-api-key="YOUR_API_KEY">
</script>

<!-- That's it! TempShield auto-attaches to every
     email field on the page and validates in real time. -->`,
  },
  {
    id: "config",
    label: "Config Options",
    icon: "⚙️",
    code: `<!-- Customize the behavior with data attributes -->
<script
  src="${SCRIPT_URL}"
  data-api-key="YOUR_API_KEY"
  data-error-message="Please use a real email address."
  data-error-color="#ef4444"
  data-debounce="600">
</script>

<!-- All options:
  data-api-key      — Your API key (required for >demo use)
  data-api-url      — Override the API base URL
  data-error-message — Custom error text shown to the user
  data-error-color  — Error text color (any CSS color)
  data-error-border — Error border color
  data-debounce     — Debounce delay in ms (default: 600)
-->`,
  },
  {
    id: "wordpress",
    label: "WordPress",
    icon: "🔷",
    code: `<?php
// Add to your theme's functions.php

add_action('wp_footer', function() {
    $api_key = 'YOUR_API_KEY';
    echo '<script
        src="${SCRIPT_URL}"
        data-api-key="' . esc_attr($api_key) . '"
        data-error-message="Please use a real email address."
    ></script>';
});

// Works with:
// • Contact Form 7
// • WooCommerce checkout
// • Gravity Forms
// • Any custom HTML form on your site`,
  },
  {
    id: "api",
    label: "Direct API",
    icon: "⚡",
    code: `// Server-side check — works in any language
const res = await fetch("${API_URL}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email: "test@mailinator.com" }),
});

const data = await res.json();
// {
//   "isDisposable": true,
//   "domain": "mailinator.com",
//   "requestsRemaining": 998
// }

if (data.isDisposable) {
  // Reject the form submission
}`,
  },
];

const PLAN_STATIC: Record<
  string,
  {
    name: string;
    period: string;
    desc: string;
    staticFeatures: string[];
    cta: string;
    href: string;
    highlighted: boolean;
  }
> = {
  FREE: {
    name: "Free",
    period: "forever",
    desc: "Perfect for testing and small projects",
    staticFeatures: [
      "Basic email detection",
      "Standard response time",
      "Community support",
    ],
    cta: "Get Started Free",
    href: "/signup",
    highlighted: false,
  },
  BASIC: {
    name: "Basic",
    period: "/month",
    desc: "For growing applications and startups",
    staticFeatures: [
      "Priority response time",
      "Usage analytics dashboard",
      "Email support",
      "Monthly reset",
    ],
    cta: "Upgrade to Basic",
    href: "/upgrade",
    highlighted: false,
  },
  PRO: {
    name: "Pro",
    period: "/month",
    desc: "For production workloads at scale",
    staticFeatures: [
      "Fastest response time",
      "Advanced analytics",
      "Priority support",
      "Monthly reset",
      "Custom integrations",
    ],
    cta: "Upgrade to Pro",
    href: "/upgrade",
    highlighted: true,
  },
};

interface LandingPlanData {
  plan: string;
  price: number;
  requestLimit: number;
  websiteLimit: number;
  mxDetectionEnabled: boolean;
  inboxCheckEnabled: boolean;
}

function buildLandingFeatures(
  planKey: string,
  data: LandingPlanData,
): string[] {
  const features: string[] = [];
  const isFree = planKey === "FREE";
  if (data.requestLimit > 0) {
    features.push(
      isFree
        ? `${data.requestLimit.toLocaleString()} requests total`
        : `${data.requestLimit.toLocaleString()} requests/month`,
    );
  }
  if (!isFree && data.websiteLimit > 0) {
    features.push(
      `${data.websiteLimit} website${data.websiteLimit > 1 ? "s" : ""}`,
    );
  }
  if (data.mxDetectionEnabled) features.push("MX record verification");
  if (data.inboxCheckEnabled) features.push("Inbox detection");
  return [...features, ...(PLAN_STATIC[planKey]?.staticFeatures ?? [])];
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-primary" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function DarkCodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/50 bg-secondary">
      <div className="flex items-center justify-between border-b border-border/30 px-4 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        <CopyButton code={code} />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-green-400 dark:text-green-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function LiveDemo({
  email,
  onEmailChange,
}: {
  email: string;
  onEmailChange: (v: string) => void;
}) {
  const [name, setName] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    isDisposable: boolean;
    domain: string;
  } | null>(null);

  const runCheck = useCallback(async (emailValue: string) => {
    if (!isValidEmail(emailValue)) {
      setResult(null);
      return;
    }
    const domain = extractDomain(emailValue);
    if (KNOWN_DISPOSABLE.has(domain)) {
      setResult({ isDisposable: true, domain });
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
        credentials: "omit",
      });
      const data = await res.json();
      if (typeof data.isDisposable === "boolean") {
        setResult({ isDisposable: data.isDisposable, domain });
      } else {
        setResult({ isDisposable: false, domain });
      }
    } catch {
      setResult({ isDisposable: false, domain });
    } finally {
      setChecking(false);
    }
  }, []);

  React.useEffect(() => {
    setResult(null);
    setChecking(false);
    if (isValidEmail(email)) {
      runCheck(email);
    }
  }, [email, runCheck]);

  const handleEmailChange = (val: string) => {
    onEmailChange(val);
  };

  const showError = result?.isDisposable === true;
  const showSuccess = result?.isDisposable === false && isValidEmail(email);

  return (
    <div className="glass-card rounded-2xl p-8 w-full max-w-sm shadow-lg">
      <div className="mb-6 flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-heading text-base font-semibold text-foreground">
          Create Account
        </h3>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                showError
                  ? "border-red-400 bg-red-500/5 focus:ring-red-400/30"
                  : showSuccess
                    ? "border-green-400 bg-green-500/5 focus:ring-green-400/30"
                    : "border-border bg-background focus:ring-primary/50"
              }`}
              placeholder="you@company.com"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {checking && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!checking && showSuccess && (
                <ShieldCheck className="h-4 w-4 text-green-500" />
              )}
              {!checking && showError && (
                <ShieldAlert className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          <AnimatePresence>
            {showError && (
              <motion.p
                key="err"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1.5 text-xs text-red-500 font-medium"
              >
                Temporary email addresses are not allowed.
              </motion.p>
            )}
            {showSuccess && (
              <motion.p
                key="ok"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1.5 text-xs text-green-500 font-medium flex items-center gap-1"
              >
                <CheckCircle2 className="h-3 w-3" /> Valid email address
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <button
          disabled={showError || !isValidEmail(email)}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Sign Up
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Protected by TempShield
      </p>
    </div>
  );
}

function formatPlanPrice(planKey: string, price: number): string {
  if (planKey === "FREE") return "$0";
  return `$${price % 1 === 0 ? price : price.toFixed(2)}`;
}

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("html");
  const [demoEmail, setDemoEmail] = useState("");
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({
    FREE: 0,
    BASIC: 9,
    PRO: 29,
  });
  const [fullPlanData, setFullPlanData] = useState<
    Record<string, LandingPlanData>
  >({
    FREE: {
      plan: "FREE",
      price: 0,
      requestLimit: 10,
      websiteLimit: 0,
      mxDetectionEnabled: false,
      inboxCheckEnabled: false,
    },
    BASIC: {
      plan: "BASIC",
      price: 9,
      requestLimit: 1000,
      websiteLimit: 0,
      mxDetectionEnabled: false,
      inboxCheckEnabled: false,
    },
    PRO: {
      plan: "PRO",
      price: 29,
      requestLimit: 10000,
      websiteLimit: 0,
      mxDetectionEnabled: false,
      inboxCheckEnabled: false,
    },
  });
  const currentTab = CODE_TABS.find((t) => t.id === activeTab)!;

  useEffect(() => {
    fetch("/api/settings/plans")
      .then((r) => r.json())
      .then((data: { plans: LandingPlanData[] }) => {
        const map: Record<string, number> = {};
        for (const { plan, price } of data.plans) map[plan] = price;
        setPlanPrices(map);
        // store full plan data for feature generation
        const full: Record<string, LandingPlanData> = {};
        for (const p of data.plans) full[p.plan] = p;
        setFullPlanData(full);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative min-h-screen overflow-hidden pt-32 pb-20">
        <div className="gradient-mesh pointer-events-none absolute inset-0" />

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative mx-auto max-w-4xl px-6 text-center"
        >
          {/* Badge */}
          <motion.div
            variants={item}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5"
          >
            <Terminal className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              Now with v2 API — 3x faster
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={item}
            className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl"
          >
            Block Fake Emails.{" "}
            <span className="text-primary">Protect Your Platform.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            Industry-leading disposable email detection API. Real-time
            verification with 99.9% accuracy powered by 5,000+ domain database.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={item}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:-translate-y-0.5 shadow-lg shadow-primary/20"
            >
              Get Free API Key
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted"
            >
              View Documentation
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={item}
            className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="glass-card rounded-xl px-6 py-5 text-center transition-transform duration-200 hover:scale-[1.02]"
              >
                <p className="font-heading text-2xl font-bold text-primary">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section id="features" className="relative py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
              Everything You Need
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              A complete toolkit to protect your platform from disposable email
              abuse.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="glass-card group rounded-xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2.5">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CODE PREVIEW ─────────────────────────────────── */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
              One Line of Code. Every Form Protected.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Drop the script into any website — WordPress, Elementor, Webflow,
              or any custom HTML. Or call the REST API directly.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-2xl overflow-hidden"
          >
            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b border-border/50 bg-muted/30">
              {CODE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "text-foreground border-b-2 border-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Code block */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="p-6"
              >
                <DarkCodeBlock
                  code={currentTab.code}
                  label={currentTab.label}
                />
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    No SDK needed. Works everywhere.
                  </p>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Get your free API key <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ── LIVE DEMO ─────────────────────────────────────── */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Live Demo
            </p>
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
              See it in action
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl">
              Try entering a disposable email like{" "}
              <button
                onClick={() => setDemoEmail("test@mailinator.com")}
                className="inline-flex rounded-md border border-border bg-muted/80 px-2 py-0.5 font-mono text-xs text-foreground transition-colors hover:bg-muted cursor-pointer"
              >
                test@mailinator.com
              </button>{" "}
              or{" "}
              <button
                onClick={() => setDemoEmail("user@10minutemail.com")}
                className="inline-flex rounded-md border border-border bg-muted/80 px-2 py-0.5 font-mono text-xs text-foreground transition-colors hover:bg-muted cursor-pointer"
              >
                user@10minutemail.com
              </button>
            </p>
          </motion.div>

          <div className="grid gap-12 md:grid-cols-2 items-start">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex justify-center md:justify-start"
            >
              <LiveDemo email={demoEmail} onEmailChange={setDemoEmail} />
            </motion.div>

            {/* Explanation */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex flex-col justify-center"
            >
              <h3 className="font-heading text-xl font-semibold text-foreground mb-4">
                Real-time validation — right in the field
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                TempShield flags disposable addresses instantly, before the user
                even submits the form. No page reload. No server round-trip for
                the user.
              </p>
              <ul className="space-y-3">
                {[
                  "Validates against 5,000+ known providers",
                  "Prevents form submission with disposable emails",
                  "Works client-side and server-side",
                  "Zero configuration on WordPress and major CMS platforms",
                  "Open CORS — works from any third-party domain",
                ].map((t, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────── */}
      <section id="pricing" className="relative py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Start free. Scale as you grow. No hidden fees.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {(["FREE", "BASIC", "PRO"] as const).map((planKey, i) => {
              const plan = { planKey, ...PLAN_STATIC[planKey] };
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
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
                    <h3 className="font-heading text-lg font-semibold text-foreground">
                      {plan.name}
                    </h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-heading text-4xl font-bold text-foreground">
                        {formatPlanPrice(
                          plan.planKey,
                          planPrices[plan.planKey] ?? 0,
                        )}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {plan.period}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {plan.desc}
                    </p>
                  </div>
                  <ul className="mb-8 flex-1 space-y-3">
                    {buildLandingFeatures(
                      plan.planKey,
                      fullPlanData[plan.planKey] ?? {
                        plan: plan.planKey,
                        price: 0,
                        requestLimit: 0,
                        websiteLimit: 0,
                        mxDetectionEnabled: false,
                        inboxCheckEnabled: false,
                      },
                    ).map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
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
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
