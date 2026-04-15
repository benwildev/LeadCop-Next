import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Navbar, Footer } from "@/components/Layout";
import {
  Shield,
  Zap,
  Lock,
  Code2,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Terminal,
  Copy,
  Check,
  Download,
  Puzzle,
  ListChecks,
  Activity,
  Bell,
  Database,
  Users,
  UserX,
  DollarSign,
  Inbox,
  TrendingUp,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EmailCheckForm from "@/components/EmailCheckForm";

const container: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0 } },
};

const item: any = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
};

const STATS = [
  { value: "100K+", label: "Fake Emails Blocked" },
  { value: "99.9%", label: "Detection Accuracy" },
  { value: "500+", label: "Businesses Protected" },
  { value: "2 min", label: "Avg. Setup Time" },
];

const PAIN_POINTS = [
  {
    icon: UserX,
    title: "Fake Signups Inflating Your List",
    desc: "Burner emails sign up for trials and free plans, skewing your metrics and draining your usage budget with zero real engagement.",
  },
  {
    icon: DollarSign,
    title: "Ad Spend Wasted on Bots",
    desc: "You're paying to retarget people who never intended to buy. Disposable addresses mean zero conversions from your campaigns.",
  },
  {
    icon: Inbox,
    title: "Junk Leads Burning Sales Time",
    desc: "Your team follows up on contacts that don't exist. Every fake lead is time your reps could spend closing real buyers.",
  },
];

const FEATURES = [
  {
    icon: Shield,
    title: "Block Every Fake Signup",
    desc: "Instantly identify and reject disposable email addresses before they ever reach your list, CRM, or database.",
  },
  {
    icon: Zap,
    title: "Zero Friction for Real Customers",
    desc: "Validation happens in real time as users type. Legitimate signups sail through; only fake ones are stopped.",
  },
  {
    icon: TrendingUp,
    title: "Cleaner Lists, Better ROI",
    desc: "Higher deliverability, lower bounce rates, and more revenue from every campaign — because every address is real.",
  },
  {
    icon: Lock,
    title: "Set It and Forget It",
    desc: "One script tag or WordPress plugin install protects every form on your site automatically. No ongoing maintenance.",
  },
  {
    icon: BarChart3,
    title: "See What's Being Blocked",
    desc: "A real-time dashboard shows every blocked attempt, which form triggered it, and how many fake signups you've stopped.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Star,
    title: "Create Your Free Account",
    desc: "Sign up in seconds — no credit card required. Your API key is ready immediately.",
  },
  {
    step: "02",
    icon: Code2,
    title: "Add to Your Forms",
    desc: "Drop one script tag onto any website, or install the WordPress plugin. Protection is active in under two minutes.",
  },
  {
    step: "03",
    icon: Shield,
    title: "Fake Emails Blocked — Automatically",
    desc: "LeadCop silently detects and rejects disposable addresses on every submission. Your list stays clean while real customers get through.",
  },
];

const SCRIPT_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/temp-email-validator.js`
    : "https://yourdomain.com/temp-email-validator.js";

const API_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/api/check-email/demo`
    : "https://yourdomain.com/api/check-email/demo";

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

<!-- That's it! LeadCop auto-attaches to every
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
    desc: "Start protecting your forms today, no card needed",
    staticFeatures: [
      "Disposable email detection",
      "Standard response time",
      "Community support",
    ],
    cta: "Start for Free",
    href: "/signup",
    highlighted: false,
  },
  BASIC: {
    name: "Basic",
    period: "/month",
    desc: "Stop fake signups as your business grows",
    staticFeatures: [
      "Priority response time",
      "Usage analytics dashboard",
      "Email support",
      "Monthly reset",
    ],
    cta: "Get Started",
    href: "/upgrade",
    highlighted: false,
  },
  PRO: {
    name: "Pro",
    period: "/month",
    desc: "Enterprise-grade protection for high-volume forms",
    staticFeatures: [
      "Fastest response time",
      "Advanced analytics",
      "Priority support",
      "Monthly reset",
      "Custom integrations",
    ],
    cta: "Get Started",
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
        ? `${data.requestLimit.toLocaleString()} checks included`
        : `${data.requestLimit.toLocaleString()} checks/month`,
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

// ── WordPress plugin section data ─────────────────────────────────────────────

const WP_FEATURES = [
  {
    icon: Puzzle,
    title: "10 Form Integrations",
    desc: "WooCommerce, CF7, WPForms, Gravity Forms, Elementor, Ninja Forms, Fluent Forms, and WordPress core forms — all covered out of the box.",
  },
  {
    icon: Database,
    title: "24-Hour Result Cache",
    desc: "API results are cached in WordPress transients for 24 hours. Repeat submissions are instant and don't consume your quota.",
  },
  {
    icon: ListChecks,
    title: "Allow / Block Lists",
    desc: "Manually allowlist your company domain or blocklist known bad actors — overrides the API for full local control.",
  },
  {
    icon: Activity,
    title: "Activity Log",
    desc: "Every email check is recorded with outcome, reason, and form name. The last 1,000 entries are kept and searchable.",
  },
  {
    icon: Bell,
    title: "Admin Notifications",
    desc: "Get an email alert the moment a form submission is blocked — so nothing slips through unnoticed.",
  },
  {
    icon: Code2,
    title: "WP REST API Endpoint",
    desc: "Use /wp-json/leadcop/v1/check from themes, page builders, or headless WordPress. Auth via your API key.",
  },
];

const WP_INTEGRATIONS = [
  { name: "WooCommerce", color: "#7f54b3" },
  { name: "Contact Form 7", color: "#e44b2b" },
  { name: "WPForms", color: "#e27730" },
  { name: "Gravity Forms", color: "#f7941d" },
  { name: "Elementor Pro", color: "#92003b" },
  { name: "Ninja Forms", color: "#dd3333" },
  { name: "Fluent Forms", color: "#1b6ef3" },
  { name: "WP Registration", color: "#2271b1" },
  { name: "WP Comments", color: "#3858e9" },
];

const WP_STEPS = [
  {
    step: "01",
    title: "Download & Upload",
    desc: "Download the plugin zip and upload it via Plugins → Add New → Upload Plugin in your WordPress admin.",
  },
  {
    step: "02",
    title: "Activate",
    desc: "Click Activate. LeadCop will appear in your admin sidebar. The log table is created automatically on first run.",
  },
  {
    step: "03",
    title: "Enter Your API Key",
    desc: "Go to LeadCop → General, paste your API key, and save. All 10 integrations are enabled and protecting forms immediately.",
  },
];

// WordPress logo SVG
function WpLogoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM3.952 12c0-1.244.265-2.428.736-3.5L8.47 20.18C5.8 18.74 3.952 15.577 3.952 12zm8.048 8.048c-.84 0-1.65-.12-2.41-.34l2.56-7.44 2.62 7.18c.017.043.038.083.06.12a8.1 8.1 0 01-2.83.48zm1.17-12.316l2.312 6.875-6.43-1.96.65-1.95 1.21.18c.56 0 1.02-.46 1.02-1.02 0-.56-.46-1.02-1.02-1.02l-1.63.04.1-.19 2.13-5.99c.3-.04.6-.06.91-.06.64 0 1.27.09 1.87.23-.01.01-.01.02-.01.03l-.94 1.88zm2.76 7.596l2.24-6.5 1.02 3.42c.19.64.37 1.38.37 1.84 0 .73-.1 1.4-.28 2.04a8.07 8.07 0 01-1.47.85c-.57-.22-1.05-.42-1.87-.65zm2.71-11.6c.28.55.46 1.19.46 1.93 0 .65-.12 1.3-.46 2.12l-1.3 3.74-2.33-6.78 1.28-3.8c.46.28.86.57 1.13 1.03-.01.18-.01.36-.01.55 0 .56.46.96 1.01.96.2 0 .38-.06.34 0l.1 2.24z" />
    </svg>
  );
}

const LOG_ENTRIES = [
  { email: "user@mailinator.com", outcome: "blocked" as const, reason: "disposable", form: "woo checkout", time: "14:23" },
  { email: "john@gmail.com", outcome: "warned" as const, reason: "free email", form: "contact form 7", time: "14:22" },
  { email: "alice@company.io", outcome: "allowed" as const, reason: "", form: "wp register", time: "14:20" },
  { email: "spam@tempmail.org", outcome: "blocked" as const, reason: "disposable", form: "wpforms", time: "14:18" },
];

const OUTCOME_COLORS = {
  blocked: { text: "#dc2626", bg: "#fef2f2", label: "blocked" },
  warned: { text: "#d97706", bg: "#fffbeb", label: "warned" },
  allowed: { text: "#16a34a", bg: "#f0fdf4", label: "allowed" },
};

const MOCK_TOGGLES = [
  { label: "WooCommerce Checkout", on: true },
  { label: "Contact Form 7", on: true },
  { label: "WPForms", on: true },
  { label: "Gravity Forms", on: false },
  { label: "Elementor Pro Forms", on: true },
  { label: "Ninja Forms", on: true },
];

function AdminPanelMockup() {
  const [activeTab, setActiveTab] = useState("integrations");
  const [visibleLog, setVisibleLog] = useState<number>(0);
  const [toggleStates, setToggleStates] = useState<boolean[]>(MOCK_TOGGLES.map((t) => t.on));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const order = ["integrations", "log", "general"];
    let i = 0;
    timerRef.current = setInterval(() => {
      i = (i + 1) % order.length;
      setActiveTab(order[i]);
    }, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (activeTab !== "log") { setVisibleLog(0); return; }
    setVisibleLog(0);
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      setVisibleLog(n);
      if (n >= LOG_ENTRIES.length) clearInterval(t);
    }, 350);
    return () => clearInterval(t);
  }, [activeTab]);

  const tabs = ["general", "integrations", "log"];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-card shadow-2xl shadow-black/20">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/50">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
        </div>
        <div className="flex-1 mx-3 rounded-md bg-background/60 px-3 py-1 text-[10px] text-muted-foreground font-mono truncate">
          /wp-admin/admin.php?page=leadcop&tab={activeTab}
        </div>
      </div>

      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40 bg-muted/20">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">LeadCop Email Validator</span>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          v1.1.0
        </span>
      </div>

      <div className="flex border-b border-border/40 bg-muted/10 px-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            }}
            className={`px-4 py-2.5 text-[11px] font-medium capitalize border-b-2 -mb-px transition-all ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "log" ? "Activity Log" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="min-h-[240px] p-4">
        <AnimatePresence mode="wait">
          {activeTab === "integrations" && (
            <motion.div
              key="integrations"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-2.5"
            >
              <p className="text-[10px] text-muted-foreground mb-3">
                Choose which form plugins LeadCop validates:
              </p>
              {MOCK_TOGGLES.map((toggle, i) => (
                <motion.div
                  key={toggle.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
                >
                  <span className="text-[11px] text-foreground">{toggle.label}</span>
                  <button
                    onClick={() => setToggleStates((s) => s.map((v, idx) => idx === i ? !v : v))}
                    className={`relative h-4 w-7 rounded-full transition-colors duration-300 ${
                      toggleStates[i] ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform duration-300 ${
                        toggleStates[i] ? "translate-x-3.5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === "log" && (
            <motion.div
              key="log"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              <p className="text-[10px] text-muted-foreground mb-3">
                Recent email checks — last 1,000 entries kept
              </p>
              <div className="rounded-lg border border-border/40 overflow-hidden">
                <div className="grid grid-cols-4 gap-2 px-3 py-1.5 bg-muted/40 text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <span>Email</span>
                  <span>Outcome</span>
                  <span>Form</span>
                  <span>Time</span>
                </div>
                {LOG_ENTRIES.slice(0, visibleLog).map((entry, i) => {
                  const c = OUTCOME_COLORS[entry.outcome];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-4 gap-2 px-3 py-1.5 text-[10px] border-t border-border/30"
                    >
                      <span className="font-mono truncate text-foreground/80">{entry.email}</span>
                      <span className="font-semibold" style={{ color: c.text }}>{c.label}</span>
                      <span className="text-muted-foreground">{entry.form}</span>
                      <span className="text-muted-foreground">{entry.time}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === "general" && (
            <motion.div
              key="general"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  API Key
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                  <span className="font-mono text-[11px] text-foreground/60 flex-1">lk_••••••••••••••••••••••</span>
                  <Check className="h-3.5 w-3.5 text-green-500" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Disposable Emails
                </label>
                <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                  <span className="text-[11px] text-foreground">Block disposable / burner emails</span>
                  <div className="relative h-4 w-7 rounded-full bg-primary">
                    <span className="absolute top-0.5 right-0.5 h-3 w-3 rounded-full bg-white shadow" />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border/40 bg-muted/10 px-3 py-2 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-primary/60" />
                <span className="text-[11px] text-muted-foreground">Activity log: </span>
                <span className="text-[11px] font-semibold text-foreground">347 checks today</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
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
  const apiUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/check-email/demo`
      : "https://yourdomain.com/api/check-email/demo";
  return <EmailCheckForm email={email} onEmailChange={onEmailChange} apiUrl={apiUrl} />;
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
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              Trusted by 500+ businesses to keep their lists clean
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={item}
            className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl"
          >
            Stop Fake Signups.{" "}
            <span className="text-primary">Protect Your Revenue.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={item}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            Disposable and burner emails are costing you money — inflating your
            list, wasting ad spend, and filling your CRM with junk. LeadCop
            stops them before they ever get in.
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
              Start for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted"
            >
              See It Work
            </a>
          </motion.div>

          {/* Trust bar */}
          <motion.p
            variants={item}
            className="mt-5 text-xs text-muted-foreground"
          >
            No credit card required &nbsp;·&nbsp; Cancel anytime &nbsp;·&nbsp; 2-minute setup
          </motion.p>

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

      {/* ── PAIN POINTS ──────────────────────────────────── */}
      <section className="relative py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Sound familiar?
            </p>
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
              Fake emails are a hidden tax on your business
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Every day you don't block them, they compound — in inflated costs,
              wasted effort, and missed revenue.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {PAIN_POINTS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="glass-card rounded-xl p-6 border-l-4 border-l-destructive/60"
              >
                <div className="mb-4 inline-flex rounded-lg bg-destructive/10 p-2.5">
                  <p.icon className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground mb-2">
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {p.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
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
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              What you get
            </p>
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
              Everything you need to keep your list clean
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              LeadCop works silently in the background so you never have to
              think about fake emails again.
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

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent" />
        <div className="relative mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Simple setup
            </p>
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
              Up and running in under 2 minutes
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              No developers needed. No complex configuration. Just paste and protect.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.45 }}
                className="glass-card group relative rounded-2xl p-6 text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              >
                {i < 2 && (
                  <div className="pointer-events-none absolute -right-3 top-1/2 hidden -translate-y-1/2 md:block">
                    <ArrowRight className="h-5 w-5 text-border" />
                  </div>
                )}
                <div className="mb-4 font-heading text-4xl font-bold text-primary/15 leading-none">
                  {step.step}
                </div>
                <div className="mb-4 mx-auto inline-flex rounded-xl bg-primary/10 p-3">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO ─────────────────────────────────────── */}
      <section id="demo" className="relative py-24 px-6">
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
              See exactly what your users will see
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
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex justify-center md:justify-start"
            >
              <LiveDemo email={demoEmail} onEmailChange={setDemoEmail} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex flex-col justify-center"
            >
              <h3 className="font-heading text-xl font-semibold text-foreground mb-4">
                Blocked in real time — before they even submit
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                LeadCop flags disposable addresses as the user types, giving
                them a chance to correct it before the form is submitted. Real
                customers are never affected.
              </p>
              <ul className="space-y-3">
                {[
                  "Checks against 100K+ known disposable domains",
                  "Stops fake submissions at the point of entry",
                  "Works on any form — contact, checkout, registration",
                  "Zero configuration on WordPress and major CMS platforms",
                  "Your real customers never see a false positive",
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

      {/* ── EASY INTEGRATION ─────────────────────────────── */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Easy Integration
            </p>
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
              Works with your existing setup
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              No SDK. No framework lock-in. Drop it into any website or call the API directly — it just works.
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
                    Works with any website, CMS, or framework.
                  </p>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Start protecting forms <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
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
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Pricing
            </p>
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Stop paying for fake leads. Start free and scale as your business grows.
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

      {/* ── WORDPRESS PLUGIN ─────────────────────────────── */}
      <section className="relative py-28 px-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2271b1]/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl">

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-20 text-center"
          >
            <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-[#2271b1]/30 bg-[#2271b1]/10 px-4 py-1.5">
              <WpLogoIcon className="h-4 w-4 text-[#2271b1]" />
              <span className="text-xs font-semibold text-[#2271b1]">WordPress Plugin</span>
            </div>
            <h2 className="font-heading text-3xl font-bold text-foreground md:text-5xl">
              No-code protection for{" "}
              <span className="bg-gradient-to-r from-[#2271b1] to-primary bg-clip-text text-transparent">
                WordPress
              </span>{" "}
              sites
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
              Install the plugin once. Every form on your site is protected automatically — no code, no configuration, no maintenance.
            </p>
          </motion.div>

          <div className="grid gap-16 lg:grid-cols-2 items-center mb-24">

            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
            >
              <ul className="space-y-5">
                {WP_FEATURES.map((f, i) => (
                  <motion.li
                    key={f.title}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07, duration: 0.4 }}
                    className="flex gap-4"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <f.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{f.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="mt-10 flex flex-wrap gap-3"
              >
                <a
                  href="/downloads/leadcop-email-validator.zip"
                  download
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2271b1] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2271b1]/20 transition-all hover:bg-[#1d5e9a] hover:-translate-y-0.5"
                >
                  <Download className="h-4 w-4" />
                  Download Plugin (Free)
                </a>
                <Link
                  href="/docs#wordpress"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-muted"
                >
                  View Setup Guide
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24, rotateY: 6 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              style={{ perspective: 1000 }}
            >
              <AdminPanelMockup />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-20 text-center"
          >
            <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Works with every major WordPress form plugin
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {WP_INTEGRATIONS.map((intg, i) => (
                <motion.span
                  key={intg.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.35, ease: "backOut" }}
                  whileHover={{ scale: 1.07, y: -2 }}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold shadow-sm transition-shadow hover:shadow-md cursor-default"
                  style={{
                    borderColor: intg.color + "40",
                    backgroundColor: intg.color + "12",
                    color: intg.color,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: intg.color }}
                  />
                  {intg.name}
                </motion.span>
              ))}
            </div>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {WP_STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.45 }}
                className="glass-card group relative rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              >
                {i < 2 && (
                  <div className="pointer-events-none absolute -right-3 top-1/2 hidden -translate-y-1/2 md:block">
                    <ArrowRight className="h-5 w-5 text-border" />
                  </div>
                )}
                <div className="mb-4 font-heading text-4xl font-bold text-primary/20 leading-none">
                  {step.step}
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ── CLOSING CTA ──────────────────────────────────── */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="relative mx-auto max-w-3xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Start protecting your forms today</span>
          </div>
          <h2 className="font-heading text-4xl font-bold text-foreground md:text-5xl leading-tight">
            Your next signup could be fake.{" "}
            <span className="text-primary">Stop it now.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Join hundreds of businesses that trust LeadCop to keep their lists
            clean, their campaigns effective, and their revenue protected.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:-translate-y-0.5 shadow-lg shadow-primary/25"
            >
              Start for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-8 py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-muted"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            No credit card required &nbsp;·&nbsp; Free plan available &nbsp;·&nbsp; Cancel anytime
          </p>
        </motion.div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
