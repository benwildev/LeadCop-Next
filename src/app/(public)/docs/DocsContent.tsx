"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield, Zap, Globe, Users, AlertCircle, CheckCircle2,
  ArrowRight, BookOpen, Code2, HelpCircle, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { 
  CodeBlock, InlineCode, Callout, FAQItem 
} from "@/components/docs/DocsHelpers";

/* ─────────────────────────── data ────────────────────────────── */

const INTEGRATIONS = [
  {
    id: "html",
    label: "HTML / Any Website",
    icon: "🌐",
    audience: "Easiest — no coding required",
    steps: [
      { title: "Get your API key", desc: "Create a free account and copy your API key from the dashboard." },
      { title: "Paste one script tag", desc: "Add the snippet just before the </body> closing tag in your website's HTML." },
      { title: "You're done!", desc: "LeadCop silently attaches to every email field and validates as users type." },
    ],
    code: `<!-- Paste just before the closing </body> tag -->
<!-- Works on any website — WordPress, Webflow, Squarespace, Shopify, etc. -->
<script
  src="https://leadcop.io/temp-email-validator.js"
  data-api-key="YOUR_API_KEY">
</script>

<!-- Optional: full configuration with all customization options -->
<script
  src="https://leadcop.io/temp-email-validator.js"
  data-api-key="YOUR_API_KEY"
  data-debounce="600"
  data-error-message="Disposable email addresses are not allowed."
  data-error-color="#ef4444"
  data-error-border="#f87171"
  data-warn-mx-message="This email domain has no mail server."
  data-warn-mx-color="#f59e0b"
  data-warn-mx-border="#fbbf24"
  data-warn-free-message="Free email providers are not accepted here."
  data-warn-free-color="#f59e0b"
  data-warn-free-border="#fbbf24">
</script>`,
  },
  {
    id: "wordpress",
    label: "WordPress Plugin",
    icon: "🔌",
    audience: "No code — install & activate",
    steps: [
      { title: "Download the plugin", desc: "Download the LeadCop Email Validator plugin .zip from the link below." },
      { title: "Upload & activate", desc: "Go to Plugins → Add New → Upload Plugin, select the zip, click Install Now → Activate." },
      { title: "Paste your API key", desc: "Open LeadCop in your WP admin menu, paste your API key, and click Save. Done — all your forms are protected." },
    ],
    code: `; No code needed! After activating the plugin:
; WordPress Admin → LeadCop → General Settings → Paste API Key → Save

; Auto-protected form systems:
;   ✅ WordPress default registration & comment forms
;   ✅ WooCommerce checkout & My Account
;   ✅ Contact Form 7
;   ✅ WPForms
;   ✅ Gravity Forms

; Configurable validation rules:
;   Block disposable emails  → ON by default (recommended)
;   Free email providers     → Off | Warn | Block (your choice)
;   No MX records (invalid)  → Off | Warn | Block (your choice)

; All checks happen server-side — bots cannot bypass them.
; The plugin fails open: forms still work if the API is unreachable.`,
  },
  {
    id: "react",
    label: "React / Next.js",
    icon: "⚛️",
    audience: "For React developers",
    steps: [
      { title: "No package to install", desc: "Call the REST API directly — no npm package needed." },
      { title: "Copy the hook", desc: "Add the useEmailCheck hook to your project." },
      { title: "Wire it to any input", desc: "Pass the email state into the hook and show the validation result." },
    ],
    code: `import { useState, useEffect } from "react";

// 1. Add this hook anywhere in your project
function useEmailCheck(email: string) {
  const [result, setResult] = useState<{
    isDisposable: boolean | null;
    isLoading: boolean;
  }>({ isDisposable: null, isLoading: false });

  useEffect(() => {
    if (!email || !email.includes("@")) {
      setResult({ isDisposable: null, isLoading: false });
      return;
    }
    const timer = setTimeout(async () => {
      setResult(prev => ({ ...prev, isLoading: true }));
      try {
        const res = await fetch("https://leadcop.io/api/check-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer YOUR_API_KEY",
          },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        setResult({ isDisposable: data.isDisposable, isLoading: false });
      } catch {
        setResult({ isDisposable: null, isLoading: false });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [email]);

  return result;
}

// 2. Use it in any form component
function SignupForm() {
  const [email, setEmail] = useState("");
  const { isDisposable, isLoading } = useEmailCheck(email);

  return (
    <form>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ borderColor: isDisposable ? "#ef4444" : undefined }}
        placeholder="your@email.com"
      />
      {isLoading && <p style={{ color: "#94a3b8" }}>Checking…</p>}
      {isDisposable && (
        <p style={{ color: "#ef4444" }}>
          Temporary email addresses are not allowed.
        </p>
      )}
      <button type="submit" disabled={!!isDisposable || isLoading}>
        Create Account
      </button>
    </form>
  );
}`,
  },
  {
    id: "node",
    label: "Node.js / Express",
    icon: "🟩",
    audience: "For backend JavaScript developers",
    steps: [
      { title: "Create the middleware", desc: "Write a reusable Express middleware function that calls the API." },
      { title: "Apply to your routes", desc: "Add it to any route that accepts an email in the request body." },
      { title: "Handle the rejection", desc: "The middleware returns a 400 response automatically for disposable emails." },
    ],
    code: `// middleware/checkEmail.js
const LEADCOP_KEY = process.env.LEADCOP_KEY;
const LEADCOP_URL = "https://leadcop.io";

async function noDisposableEmail(req, res, next) {
  const email = req.body?.email;
  if (!email) return next();   // skip if no email in body

  try {
    const response = await fetch(\`\${LEADCOP_URL}/api/check-email\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${LEADCOP_KEY}\`,
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (data.isDisposable) {
      return res.status(400).json({
        error: "Temporary email addresses are not allowed.",
        field: "email",
      });
    }
  } catch (err) {
    // Fail open — if the API is unreachable, let the request through
    console.error("LeadCop check failed:", err.message);
  }

  next();
}

// Attach to any Express route:
router.post("/signup", noDisposableEmail, async (req, res) => {
  const { email, password } = req.body;
  // If we reach here, the email is safe to store
  await createUser({ email, password });
  res.json({ success: true });
});`,
  },
  {
    id: "laravel",
    label: "Laravel / PHP",
    icon: "🐘",
    audience: "For PHP / Laravel developers",
    steps: [
      { title: "Add to .env", desc: "Store your key as LEADCOP_KEY in your .env file." },
      { title: "Create a Rule class", desc: "Copy the NoDisposableEmail rule into app/Rules/." },
      { title: "Apply to any form", desc: "Use the rule inside your FormRequest or controller validation." },
    ],
    code: `<?php
// Step 1: .env
// LEADCOP_KEY=your_api_key_here

// Step 2: app/Rules/NoDisposableEmail.php
namespace App\\Rules;

use Illuminate\\Contracts\\Validation\\Rule;
use Illuminate\\Support\\Facades\\Http;

class NoDisposableEmail implements Rule
{
    public function passes($attribute, $value): bool
    {
        try {
            $response = Http::timeout(3)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . env('LEADCOP_KEY'),
                ])
                ->post('https://leadcop.io/api/check-email', [
                    'email' => $value,
                ]);

            // fail open if API unreachable
            return $response->successful()
                ? !$response->json('isDisposable')
                : true;
        } catch (\\Exception $e) {
            return true; // fail open
        }
    }

    public function message(): string
    {
        return 'Temporary email addresses are not allowed.';
    }
}

// Step 3: Use in any FormRequest or controller
public function rules(): array
{
    return [
        'email' => ['required', 'email', new NoDisposableEmail],
    ];
}`,
  },
  {
    id: "python",
    label: "Python / Django",
    icon: "🐍",
    audience: "For Python developers",
    steps: [
      { title: "pip install requests", desc: "One dependency — or use httpx for async support." },
      { title: "Copy the helper function", desc: "Add is_disposable_email() to a utils.py file in your project." },
      { title: "Call it from your validator", desc: "Use it in a Django form, DRF serializer, or FastAPI validator." },
    ],
    code: `import requests
from functools import lru_cache

LEADCOP_KEY = "YOUR_API_KEY"
LEADCOP_URL = "https://leadcop.io/api/check-email"

@lru_cache(maxsize=512)
def is_disposable_email(email: str) -> bool:
    """Returns True if the email is from a disposable provider."""
    try:
        response = requests.post(
            LEADCOP_URL,
            json={"email": email},
            headers={
                "Authorization": f"Bearer {LEADCOP_KEY}",
                "Content-Type": "application/json",
            },
            timeout=3,
        )
        return response.json().get("isDisposable", False)
    except Exception:
        return False  # fail open


# ── Django Form example ───────────────────────────────
from django import forms

class SignupForm(forms.Form):
    email = forms.EmailField()

    def clean_email(self):
        email = self.cleaned_data["email"]
        if is_disposable_email(email):
            raise forms.ValidationError(
                "Temporary email addresses are not allowed."
            )
        return email


# ── Django REST Framework serializer example ─────────
from rest_framework import serializers

class UserSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if is_disposable_email(value):
            raise serializers.ValidationError(
                "Temporary email addresses are not allowed."
            )
        return value`,
  },
  {
    id: "curl",
    label: "cURL / REST",
    icon: "⚡",
    audience: "Test the API directly from your terminal",
    steps: [
      { title: "No setup required", desc: "Just send a POST request — works in any language or tool." },
      { title: "Read the response", desc: "Check the isDisposable boolean in the JSON response." },
      { title: "Act on the result", desc: "Reject form submission if isDisposable is true." },
    ],
    code: `# ── Basic request ────────────────────────────────────
curl -X POST https://leadcop.io/api/check-email \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "test@mailinator.com"}'

# ── Response: disposable email detected ──────────────
{
  "isDisposable": true,
  "domain": "mailinator.com",
  "requestsRemaining": 998
}

# ── Response: legitimate email ───────────────────────
{
  "isDisposable": false,
  "domain": "gmail.com",
  "requestsRemaining": 997
}

# ── Error: missing or invalid API key ────────────────
# HTTP 401
{ "error": "API key required. Pass Authorization: Bearer <key>" }

# ── Error: request limit reached ─────────────────────
# HTTP 429
{ "error": "Rate limit exceeded. Upgrade your plan to continue." }`,
  },
];

const ERROR_CODES = [
  { code: "200", status: "OK", desc: "Request succeeded. Check the isDisposable field in the response.", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { code: "400", status: "Bad Request", desc: "The email field is missing or the value is not a valid email address format.", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { code: "401", status: "Unauthorized", desc: "No API key was provided, or the key is invalid. Include Authorization: Bearer YOUR_KEY in the request headers.", color: "text-red-600 bg-red-50 border-red-200" },
  { code: "422", status: "Unprocessable", desc: "The request body could not be parsed. Ensure you are sending valid JSON with Content-Type: application/json.", color: "text-orange-600 bg-orange-50 border-orange-200" },
  { code: "429", status: "Too Many Requests", desc: "You have exceeded your plan's monthly request limit. Upgrade your plan or wait until the next reset.", color: "text-rose-600 bg-rose-50 border-rose-200" },
  { code: "5xx", status: "Server Error", desc: "A temporary server error occurred. Your integration should fail open (allow the request through) and retry later.", color: "text-slate-600 bg-slate-50 border-slate-200" },
];

const FAQS = [
  {
    q: "What is a disposable or temporary email address?",
    a: "A disposable email (also called a throwaway, temp, or burner email) is a short-lived inbox created specifically to bypass registration forms — for example, mail from mailinator.com, guerrillamail.com, or yopmail.com. Real users never give these as their main email, so blocking them protects your list quality.",
  },
  {
    q: "Will blocking disposable emails hurt my conversion rate?",
    a: "No. Legitimate users — the customers you actually want — use real email addresses. The only people blocked are those who were never going to engage with your product in the first place. Most businesses see no change in genuine signups but a significant reduction in bounce rates and spam complaints.",
  },
  {
    q: "What happens if the LeadCop API goes down?",
    a: "All our code examples use a 'fail open' pattern — if the API is unreachable or returns an error, your form continues to work normally. We recommend this approach so your registration flow is never blocked by a third-party dependency.",
  },
  {
    q: "Does LeadCop work with my existing form tool?",
    a: "Yes. The HTML embed script attaches automatically to any <input type=\"email\"> on the page, regardless of what framework or form builder generated it. The WordPress plugin additionally supports Contact Form 7, WPForms, Gravity Forms, and WooCommerce.",
  },
  {
    q: "Do I need a developer to set this up?",
    a: "Not if you're using the HTML embed script or WordPress plugin. You just paste one line of code (or upload a zip file). No programming knowledge required. If you want to integrate the API directly into a backend, it's a simple POST request — most developers have it working in under 10 minutes.",
  },
  {
    q: "Is user data stored or logged?",
    a: "Email addresses submitted to the API are checked against our allow/deny list and are not permanently stored or sold. Only anonymised usage metrics (request counts per API key) are retained for billing purposes.",
  },
  {
    q: "Can I test the API before buying a paid plan?",
    a: "Yes. Our Free plan includes 10 checks so you can verify your integration works end-to-end at no cost. The /api/check-email endpoint is also available for testing.",
  },
  {
    q: "What does the 'Free email warning' feature do?",
    a: "When enabled, the script will display a warning (but NOT block) if a user enters a Google, Yahoo, Hotmail or other free provider address. This is useful for B2B products that require a work email — you can warn the user without fully preventing them from signing up.",
  },
];

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "quickstart", label: "Quick Start" },
  { id: "how-it-works", label: "How It Works" },
  { id: "authentication", label: "Authentication" },
  { id: "endpoint", label: "API Endpoint" },
  { id: "integration-guides", label: "Integration Guides" },
  { id: "error-codes", label: "Error Codes" },
  { id: "rate-limits", label: "Rate Limits" },
  { id: "faq", label: "FAQ" },
];

export function DocsContent() {
  const [activeTab, setActiveTab] = useState("html");
  const [activeNav, setActiveNav] = useState("overview");

  const plans = [
    { plan: "FREE", requestLimit: 1000, rateLimitPerSecond: 1 },
    { plan: "BASIC", requestLimit: 50000, rateLimitPerSecond: 10 },
    { plan: "CUSTOM", requestLimit: -1, rateLimitPerSecond: 100 },
  ];

  // Highlight nav item on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveNav(e.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const current = INTEGRATIONS.find((i) => i.id === activeTab)!;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 pt-28 pb-24">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12 items-start">

          {/* ── Sticky sidebar nav ─────────────────────── */}
          <aside className="hidden lg:block sticky top-24 self-start">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 px-3">On this page</p>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setActiveNav(item.id)}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition-all ${activeNav === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mt-12 rounded-3xl bg-slate-900 p-6 text-white shadow-xl shadow-slate-950/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Shield className="h-24 w-24" />
              </div>
              <p className="text-sm font-bold mb-2 relative z-10">Free plan available</p>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed relative z-10">Start protecting your forms — no credit card needed.</p>
              <Link
                href="/signup"
                className="block text-center rounded-xl bg-primary text-white text-xs font-bold py-3 hover:opacity-90 transition-all relative z-10"
              >
                Get started free →
              </Link>
            </div>
          </aside>

          {/* ── Main content ───────────────────────────── */}
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-w-0 space-y-24"
          >

            {/* ── OVERVIEW ─────────────────────────────── */}
            <section id="overview" className="scroll-mt-24">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-bold tracking-widest text-primary uppercase">Documentation</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
                Integrate <span className="text-primary">LeadCop.</span>
              </h1>
              <p className="text-slate-500 text-lg max-w-2xl leading-relaxed mb-10">
                Protect your registration forms and email lists from disposable,
                temporary, and fake email addresses. This guide covers everything from a
                simple no-code setup to full backend API integration.
              </p>

              <div className="grid sm:grid-cols-3 gap-6">
                {[
                  {
                    icon: <Globe className="h-5 w-5 text-emerald-500" />,
                    bg: "bg-emerald-50/50 border-emerald-100",
                    title: "No-code setup",
                    desc: "Use the HTML script tag or WordPress plugin. No coding required.",
                    href: "#quickstart",
                    cta: "Quick Start",
                    color: "text-emerald-600",
                  },
                  {
                    icon: <Code2 className="h-5 w-5 text-primary" />,
                    bg: "bg-primary/5 border-primary/10",
                    title: "API Reference",
                    desc: "Jump to the API endpoint reference and integration code samples.",
                    href: "#authentication",
                    cta: "API Reference",
                    color: "text-primary",
                  },
                  {
                    icon: <HelpCircle className="h-5 w-5 text-blue-500" />,
                    bg: "bg-blue-50/50 border-blue-100",
                    title: "FAQs",
                    desc: "Read the FAQ for common questions about how LeadCop works.",
                    href: "#faq",
                    cta: "Read FAQ",
                    color: "text-blue-600",
                  },
                ].map((card) => (
                  <a
                    key={card.title}
                    href={card.href}
                    className={`group rounded-3xl border p-6 transition-all hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 ${card.bg}`}
                  >
                    <div className="mb-4">{card.icon}</div>
                    <p className="text-sm font-bold text-slate-900 mb-2">{card.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed mb-6">{card.desc}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${card.color}`}>{card.cta} →</span>
                  </a>
                ))}
              </div>
            </section>

            {/* ── QUICK START ────────────────── */}
            <section id="quickstart" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-4 tracking-tight">Quick Start</h2>
              <p className="text-slate-500 text-sm mb-8 max-w-2xl">
                The fastest way to protect your website — no programming needed. You just need to copy and paste one line of code.
              </p>

              <div className="rounded-[32px] border border-slate-100 bg-white p-8 mb-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-8 uppercase tracking-widest">3 steps to protect any website</h3>
                <ol className="space-y-8">
                  {[
                    {
                      icon: <Users className="h-5 w-5 text-primary" />,
                      title: "Create a free account",
                      desc: "Sign up — no credit card required. Your API key is generated automatically.",
                      extra: <Link href="/signup" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:gap-2 transition-all uppercase tracking-widest">Create free account →</Link>,
                    },
                    {
                      icon: <Code2 className="h-5 w-5 text-primary" />,
                      title: "Copy the script tag",
                      desc: "Paste this snippet just before the closing </body> tag in your website's HTML:",
                      extra: (
                        <div className="mt-6">
                          <CodeBlock lang="HTML" code={`<script\n  src="https://leadcop.io/temp-email-validator.js"\n  data-api-key="YOUR_API_KEY">\n</script>`} />
                        </div>
                      ),
                    },
                    {
                      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
                      title: "That's it — you're protected",
                      desc: "LeadCop automatically finds every email input field on your site. When someone types a disposable email, they'll see an error.",
                      extra: (
                        <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                          <p className="text-xs text-emerald-700 font-bold">✅ Real-time validation as users type.</p>
                        </div>
                      ),
                    },
                  ].map((step, i) => (
                    <li key={i} className="flex gap-6">
                      <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 font-bold text-sm text-primary">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {step.icon}
                          <p className="text-sm font-bold text-slate-900">{step.title}</p>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                        {step.extra}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <Callout type="tip">
                Using WordPress? Skip the code entirely — install the <Link href="/#install" className="underline font-bold">WordPress plugin</Link> and your forms are protected in under 2 minutes.
              </Callout>
            </section>

            {/* ── AUTHENTICATION ────────────────────────── */}
            <section id="authentication" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-4 tracking-tight">Authentication</h2>
              <p className="text-slate-500 text-sm mb-8 max-w-2xl">
                Format your secret API key in the <InlineCode>Authorization</InlineCode> header for REST API requests.
              </p>

              <div className="rounded-[32px] border border-slate-100 bg-white p-8 space-y-6 shadow-sm">
                <CodeBlock lang="HTTP Header" code={`Authorization: Bearer YOUR_API_KEY`} />
              </div>
            </section>

            {/* ── API ENDPOINT ──────────────────────────── */}
            <section id="endpoint" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-4 tracking-tight">API Endpoint</h2>
              <div className="rounded-[32px] border border-slate-100 bg-white overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 p-6 border-b border-slate-100 bg-slate-50/50">
                  <span className="rounded-lg bg-primary px-3 py-1 font-mono text-[10px] font-bold text-white uppercase tracking-widest">POST</span>
                  <code className="font-mono text-sm font-bold text-slate-800">https://leadcop.io/api/check-email</code>
                </div>

                <div className="p-8 grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Request body</p>
                    <CodeBlock lang="JSON" code={`{\n  "email": "test@mailinator.com"\n}`} />
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Response</p>
                    <CodeBlock lang="JSON" code={`{\n  "isDisposable": true,\n  "domain": "mailinator.com",\n  "requestsRemaining": 999\n}`} />
                  </div>
                </div>
              </div>
            </section>

            {/* ── INTEGRATION GUIDES ────────────────────── */}
            <section id="integration-guides" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-8 tracking-tight">Integration Guides</h2>
              <div className="rounded-[32px] border border-slate-100 bg-white overflow-hidden shadow-sm">
                <div className="flex overflow-x-auto border-b border-slate-100 bg-slate-50/30">
                  {INTEGRATIONS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${activeTab === item.id
                          ? "border-primary text-primary bg-primary/5"
                          : "border-transparent text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                    >
                      <span>{item.icon}</span> {item.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-8"
                  >
                    <div className="grid lg:grid-cols-[1fr_2fr] gap-12 items-start">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 mb-6 uppercase tracking-widest">{current.label}</h3>
                        <ol className="space-y-6">
                          {current.steps.map((step, i) => (
                            <li key={i} className="flex gap-4">
                              <span className="shrink-0 w-6 h-6 rounded-lg bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{step.title}</p>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div className="min-w-0">
                        <CodeBlock lang={current.label} code={current.code} />
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </section>

            {/* ── ERROR CODES ───────────────────────────── */}
            <section id="error-codes" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-6 tracking-tight">Error Codes</h2>
              <div className="rounded-[32px] border border-slate-100 bg-white overflow-hidden divide-y divide-slate-100 shadow-sm">
                {ERROR_CODES.map((e) => (
                  <div key={e.code} className="flex items-start gap-6 p-6 hover:bg-slate-50/50 transition-colors">
                    <span className={`shrink-0 rounded-lg border px-3 py-1 text-[10px] font-bold font-mono tracking-widest ${e.color}`}>
                      {e.code}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900 mb-1">{e.status}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{e.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── RATE LIMITS ───────────────────────────── */}
            <section id="rate-limits" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-4 tracking-tight">Rate Limits</h2>
              <p className="text-slate-500 text-sm mb-8 max-w-2xl">
                To ensure high availability and prevent abuse, LeadCop enforces rate limits across all subscription tiers.
              </p>

              <div className="rounded-[32px] border border-slate-100 bg-white overflow-hidden shadow-sm">
                <div className="grid grid-cols-3 bg-slate-50/50 p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                  <div className="pl-4">Plan Tier</div>
                  <div>Monthly Credits</div>
                  <div>Rate Limit</div>
                </div>
                {plans.map((cfg) => (
                  <div key={cfg.plan} className="grid grid-cols-3 items-center p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="pl-4">
                      <p className="text-sm font-bold text-slate-900">{cfg.plan}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        {cfg.requestLimit === -1 ? "Unlimited" : cfg.requestLimit.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-600 border border-emerald-100 uppercase tracking-widest">
                        {cfg.rateLimitPerSecond} REQ/SEC
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── FAQ ───────────────────────────────────── */}
            <section id="faq" className="scroll-mt-24">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-8 tracking-tight">Frequently Asked Questions</h2>
              <div className="rounded-[32px] border border-slate-100 bg-white p-4 px-8 shadow-sm">
                {FAQS.map((faq, i) => (
                  <FAQItem key={i} q={faq.q} a={faq.a} />
                ))}
              </div>
            </section>

            {/* ── CTA ───────────────────────────────────── */}
            <section className="rounded-[40px] bg-slate-950 p-12 text-center text-white shadow-2xl shadow-slate-950/20 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-12 opacity-10">
                <Shield className="h-64 w-64 text-primary" />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-extrabold mb-6 tracking-tight">Protect your <span className="text-primary">growth.</span></h2>
                <p className="text-slate-400 text-lg mb-10 max-w-sm mx-auto">
                  Set up takes under 2 minutes. Start for free today and clean your lead data instantly.
                </p>
                <Link href="/signup" className="inline-flex items-center justify-center px-10 py-5 rounded-2xl bg-primary text-white font-bold transition hover:opacity-90 shadow-xl shadow-primary/20">
                  Start for free today
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </div>
            </section>

          </motion.main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
