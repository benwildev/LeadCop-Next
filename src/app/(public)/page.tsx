"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Globe,
  Mail,
  Download,
  MoveRight,
  Server,
  Shield,
  Sparkles,
  Star,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { PricingSection } from "@/components/landing/PricingSection";
import { Logo } from "@/components/Logo";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { LiveDemoWidget } from "@/components/landing/LiveDemoWidget";
import { NewsletterForm } from "@/components/landing/NewsletterForm";
import { FeatureCard, CodeSnippet } from "@/components/landing/LandingHelpers";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"html" | "wordpress">("html");

  const htmlSnippet = `<!-- Paste just before </body> -->
<script
  src="https://leadcop.io/temp-email-validator.js"
  data-api-key="YOUR_API_KEY">
</script>`;

  const stats = [
    { value: "2.4M+", label: "signups checked" },
    { value: "99.7%", label: "accuracy rate" },
    { value: "<100ms", label: "average decision time" },
    { value: "5 min", label: "typical setup" },
  ];

  const steps = [
    {
      number: "01",
      title: "Connect LeadCop",
      text: "Add one script or install the WordPress plugin. LeadCop attaches to your forms automatically.",
    },
    {
      number: "02",
      title: "Check every signup",
      text: "Disposable, typo, relay, and role-based emails are classified in real time before they enter your CRM.",
    },
    {
      number: "03",
      title: "Keep the good leads",
      text: "Real visitors move through the form normally while bad data gets blocked or flagged instantly.",
    },
  ];

  const proofCards = [
    {
      title: "Cleaner pipelines",
      description: "Keep junk addresses out of sales workflows, onboarding, and marketing automation from the start.",
      icon: <Shield className="h-5 w-5" />,
    },
    {
      title: "Lower ad waste",
      description: "Paid traffic stops turning into fake submissions, which makes channel performance easier to trust.",
      icon: <Zap className="h-5 w-5" />,
    },
    {
      title: "Better deliverability",
      description: "Valid inboxes mean fewer bounces, stronger sender reputation, and more dependable campaign data.",
      icon: <Mail className="h-5 w-5" />,
    },
  ];

  const features = [
    {
      title: "Disposable Email Detection",
      description: "Instantly blocks 200,000+ burner and temporary email providers. Updated daily to catch new domains.",
      icon: <Trash2 className="h-5 w-5" />,
      preview: {
        email: "temp123@mailinator.com",
        details: [{ label: "domain_exists", value: "true" }],
        badge: { text: "BLOCKED", tone: "red" as const },
        dot: "red",
      },
      buttonText: "Block",
      primary: false,
    },
    {
      title: "Email Forwarding Detection",
      description: "Detects hidden relay services and forwarding domains used to mask real user identities.",
      icon: <MoveRight className="h-5 w-5" />,
      preview: {
        email: "forward@outlook.com",
        details: [{ label: "forwarding", value: '"detected"' }],
        badge: { text: "FLAG RELAY", tone: "orange" as const },
        dot: "orange",
      },
      buttonText: "Verify Identity",
    },
    {
      title: "MX Records Validation",
      description: "Verifies that the domain's mail servers are configured and capable of receiving mail.",
      icon: <Server className="h-5 w-5" />,
      preview: {
        email: "contact@example.com",
        details: [{ label: "mx", value: '"valid"' }],
        badge: { text: "ACCEPTED", tone: "emerald" as const },
        dot: "emerald",
      },
      buttonText: "Mark as Valid",
    },
    {
      title: "Public Email Detection",
      description: "Identifies personal email providers like Gmail or Yahoo, perfect for B2B segmentation.",
      icon: <Globe className="h-5 w-5" />,
      preview: {
        email: "john.doe@gmail.com",
        details: [{ label: "public_domain", value: "true" }],
        badge: { text: "ASK FOR WORK MAIL", tone: "sky" as const },
        dot: "sky",
      },
      buttonText: "Ask for Work Email",
    },
    {
      title: "Smart Email Suggestions",
      description: "Intelligently catches common domain typos like gmial.com and suggests the correct fix.",
      icon: <Sparkles className="h-5 w-5" />,
      preview: {
        email: "user@gmial.com",
        details: [{ label: "suggestion", value: '"user@gmail.com"' }],
        badge: { text: "SUGGEST FIX", tone: "amber" as const },
        dot: "amber",
      },
      buttonText: "Suggest Fix",
    },
    {
      title: "Role Account Detection",
      description: "Flags shared addresses like support@ or admin@ that often lead to poor conversions.",
      icon: <Users className="h-5 w-5" />,
      preview: {
        email: "support@company.com",
        details: [{ label: "role_account", value: "true" }],
        badge: { text: "FLAG ROLE", tone: "orange" as const },
        dot: "orange",
      },
      buttonText: "Accept",
    },
    {
      title: "Comprehensive TLD Validation",
      description: "Cross-references every email against a database of 1,400+ official TLDs to catch invalid extensions and malformed domains.",
      icon: <Globe className="h-5 w-5" />,
      preview: {
        email: "user@startup-identity.xyz",
        details: [
          { label: "domain_exists", value: "true" },
          { label: "tld_valid", value: "true" },
        ],
        badge: { text: "NEW", tone: "sky" as const },
        dot: "sky",
      },
      buttonText: "Validate Domain",
      wide: true,
    },
  ];

  const landingPlans = [
    {
      plan: "FREE",
      price: 0,
      requestLimit: 1000,
      description: "Start with basic disposable email protection.",
      features: ["Basic verification API", "1,000 checks/mo", "Email support"],
    },
    {
      plan: "BASIC",
      price: 29,
      requestLimit: 50000,
      description: "Protect growth campaigns with faster checks and analytics.",
      features: ["Real-time email scanning", "50,000 checks/mo", "Priority support"],
    },
    {
      plan: "CUSTOM",
      price: 0,
      requestLimit: -1,
      description: "Custom volume, dedicated support, and SLA-ready protection.",
      features: ["Unlimited domains", "Dedicated account manager", "Onboarding support"],
    },
  ];

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-white overflow-x-hidden">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="relative pt-20 pb-24 lg:pt-32 lg:pb-40 border-b border-slate-100">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              
              {/* Hero Content */}
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-8">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Real-time Disposable Email Guard
                </div>

                <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl md:text-6xl leading-[1.1]">
                  Stop fake signups <span className="text-primary block mt-2">at the gate.</span>
                </h1>

                <p className="mt-8 text-lg leading-relaxed text-slate-500">
                  LeadCop validates every submission in real time. We instantly filter out disposable emails, bots, and low-conversion role accounts before they pollute your pipeline or CRM.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/signup"
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-[15px] font-bold text-white transition hover:bg-slate-900"
                  >
                    Start free trial
                  </Link>
                  <a
                    href="#demo"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 text-[15px] font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    Run live demo
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>

                <div className="mt-10 flex flex-wrap gap-5 text-[12px] font-medium text-slate-400">
                  {["No credit card required", "Works on any website", "WordPress plugin"].map((item) => (
                    <span key={item} className="inline-flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500/60" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div id="demo" className="mt-10 lg:mt-0">
                <LiveDemoWidget />
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-white py-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="product" className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-3xl text-center mx-auto mb-16">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Why teams use LeadCop</p>
            <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl leading-[1.1]">
              Built to remove friction, <br className="hidden sm:block" />not add it.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-600">
              Keep bad data out, keep good leads moving. LeadCop acts as a seamless gateway that ensures only high-quality contacts reach your team.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {proofCards.map((card) => (
              <FeatureCard
                key={card.title}
                icon={card.icon}
                title={card.title}
                description={card.description}
              />
            ))}
          </div>
        </section>

        {/* How it Works Section */}
        <section id="how" className="border-y border-slate-100 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-24 mb-16 items-end">
              <div className="max-w-2xl">
                <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">How it works</p>
                <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl leading-[1.1]">
                  Three steps to a cleaner funnel
                </h2>
              </div>
              <p className="max-w-xl text-lg leading-relaxed text-slate-600">
                No redesign, no custom flow, no complicated setup sequence. Just install, check, and keep the good data.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="rounded-2xl border border-slate-200 bg-white p-8 transition-shadow hover:shadow-md">
                  <p className="text-[13px] font-extrabold uppercase tracking-[0.2em] text-primary">{step.number}</p>
                  <h3 className="mt-5 font-display text-[22px] font-bold text-slate-950">{step.title}</h3>
                  <p className="mt-4 text-[16px] leading-relaxed text-slate-600">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Installation Section */}
        <section id="install" className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] font-semibold text-primary">Installation</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">
                One line of code on any website.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                LeadCop works with static HTML, React, Next.js, WordPress, and form builders. You keep your existing
                stack and add protection on top.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {["HTML forms", "React and Next.js", "WordPress", "WPForms and CF7"].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                {(["html", "wordpress"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-6 py-2 text-sm font-bold transition ${activeTab === tab
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {tab === "html" ? "HTML snippet" : "WordPress plugin"}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                {activeTab === "html" ? (
                  <div>
                    <CodeSnippet code={htmlSnippet} />
                    <p className="mt-3 text-sm text-slate-500">
                      Paste the script once and LeadCop protects every signup form it can detect on the page.
                    </p>
                    <Link
                      href="/docs"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-900 hover:gap-3 transition-all"
                    >
                      View developer docs
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-slate-200 bg-white p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">WordPress setup</p>
                    <div className="mt-5 space-y-4">
                      {[
                        "Download the plugin ZIP file below.",
                        "Open WordPress Dashboard → Plugins → Add New → Upload Plugin.",
                        "Install and activate the plugin.",
                        "Paste your API key in LeadCop settings.",
                        "Save and start protecting your forms.",
                      ].map((step, index) => (
                        <div key={step} className="flex items-start gap-4">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                            {index + 1}
                          </div>
                          <p className="pt-0.5 text-sm font-medium text-slate-600">{step}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <a
                        href="/downloads/leadcop-email-validator.zip"
                        download
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Download className="h-4 w-4" />
                        Download Plugin ZIP
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid Section */}
        <section className="border-y border-slate-100 bg-slate-50/30">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="text-center mb-16">
              <p className="text-xs uppercase tracking-[0.22em] font-bold text-primary">Coverage</p>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
                Everything you need to <br className="hidden sm:block" /> validate emails instantly
              </h2>
              <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Understand email quality in real-time without technical complexity. Precision checks for every contact.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <FeatureCard
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  preview={feature.preview}
                  buttonText={feature.buttonText}
                  primary={feature.primary}
                  wide={feature.wide}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">Social Proof</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl leading-[1.1]">
              Trusted by security ops <br className="hidden sm:block" /> & marketing teams.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                quote: "Our CRM stopped filling up with junk the same day we installed it. The blocked data insights are eye-opening.",
                name: "Marcus T.",
                role: "E-commerce founder",
              },
              {
                quote: "The plugin was simple enough that marketing handled setup without engineering. It just works.",
                name: "Rachel K.",
                role: "Growth consultant",
              },
              {
                quote: "Paid signup campaigns became easier to trust because fake leads dropped off immediately. Highly recommend.",
                name: "David M.",
                role: "SaaS operator",
              },
            ].map((item) => (
              <div key={item.name} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-6 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-[16px] leading-relaxed text-slate-600">"{item.quote}"</p>
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <p className="text-[14px] font-bold text-slate-900">{item.name}</p>
                  <p className="text-[12px] font-bold text-primary">{item.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Summary Section */}
        <section className="py-12 bg-white">
          <PricingSection plans={landingPlans} />
        </section>

        {/* CTA / Newsletter Section */}
        <section className="bg-slate-950 py-24 overflow-hidden relative">
          <div className="mx-auto max-w-4xl px-6 text-center relative z-10">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/60 mb-6">Newsletter</p>
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl mb-8">
              Practical notes on <span className="text-primary">lead quality.</span>
            </h2>
            <p className="mx-auto max-w-xl text-lg leading-relaxed text-white/50 mb-12">
              Weekly product updates, anti-spam tactics, and lessons from teams cleaning up acquisition funnels.
            </p>
            <div className="mx-auto max-w-xl p-8 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-sm">
              <NewsletterForm />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
