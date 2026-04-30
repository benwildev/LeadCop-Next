"use client";

import React from "react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { PricingSection } from "@/components/landing/PricingSection";
import { useQuery } from "@tanstack/react-query";
import { axiosSecure } from "@/lib/api-client-react";
import { Loader2, ShieldCheck, Zap, Globe, MessageCircle, HelpCircle, ChevronRight } from "lucide-react";
import { LandingPlan } from "@/lib/api";

export function PricingContent() {
  const { data: plans = [], isLoading } = useQuery<LandingPlan[]>({
    queryKey: ["/api/plans"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/plans");
      const configs = response.data.plans || [];
      return configs.map((c: any) => ({
        plan: c.plan,
        price: c.price,
        requestLimit: c.requestLimit,
        description: c.description || "",
        features: c.features || [],
      })).sort((a: any, b: any) => a.price - b.price);
    }
  });

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-20">
        {/* Hero */}
        <div className="bg-slate-50 border-b border-slate-100 py-32 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary rounded-full blur-[120px]" />
          </div>
          <div className="max-w-4xl mx-auto px-6 relative z-10">
             <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[11px] font-bold tracking-widest text-primary border border-slate-100 mb-8 uppercase">
               <Zap className="h-3.5 w-3.5" />
               Transparent Pricing
             </span>
             <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1]">
               Scale your <span className="text-primary">lead quality.</span>
             </h1>
             <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
               Simple plans for developers and marketing teams. No hidden fees, no complicated tiers. Start protecting your growth today.
             </p>
          </div>
        </div>

        {/* Pricing Table */}
        <div className="relative -mt-12 z-20">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-48 gap-4 bg-white rounded-t-[48px]">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-slate-400 font-medium tracking-wide">Fetching best options...</p>
            </div>
          ) : (
            <div className="bg-white rounded-t-[48px]">
              <PricingSection plans={plans} />
            </div>
          )}
        </div>

        {/* Features / Trust Grid */}
        <section className="py-32 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid gap-12 md:grid-cols-3">
              {[
                { icon: ShieldCheck, title: "Data Security", desc: "Enterprise-grade encryption for all verification requests and user data." },
                { icon: Globe, title: "Global Coverage", desc: "Support for 1,400+ TLDs and 200,000+ disposable email providers worldwide." },
                { icon: MessageCircle, title: "Expert Support", desc: "Dedicated support team available to help you integrate and optimize." },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center p-8 rounded-3xl border border-slate-50 hover:bg-slate-50 transition-colors">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">{item.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-32 bg-slate-50 border-y border-slate-100">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">Questions?</h2>
              <p className="text-lg text-slate-500">Everything you need to know about LeadCop pricing.</p>
            </div>
            
            <div className="space-y-6">
              {[
                { q: "What counts as a verification check?", a: "A check is any single email validation request sent via our API, JS script, or WordPress plugin." },
                { q: "Can I upgrade or downgrade later?", a: "Yes, you can change your plan at any time from your dashboard. Pro-rated adjustments apply automatically." },
                { q: "Do unused checks roll over?", a: "Checks are assigned on a monthly basis and reset at the end of each billing cycle." },
                { q: "Do you offer custom enterprise plans?", a: "Absolutely. For volumes over 1M checks/mo, contact our sales team for custom pricing." },
              ].map((item, i) => (
                <div key={i} className="p-8 rounded-2xl bg-white border border-slate-200 hover:shadow-lg hover:shadow-slate-200/50 transition-all group">
                  <div className="flex items-start gap-4">
                    <HelpCircle className="w-6 h-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-primary transition-colors">{item.q}</h4>
                      <p className="text-slate-500 leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Enterprise CTA */}
        <section className="py-32">
           <div className="max-w-4xl mx-auto px-6">
             <div className="p-12 rounded-[40px] bg-slate-900 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                  <ShieldCheck className="w-64 h-64" />
                </div>
                <div className="relative z-10">
                  <h2 className="text-3xl md:text-5xl font-extrabold mb-8 tracking-tight">Large-scale <span className="text-primary">Protection.</span></h2>
                  <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
                    Handling millions of signups? Get a custom architecture and dedicated support for your enterprise needs.
                  </p>
                  <a href="mailto:support@leadcop.io" className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-2xl bg-primary text-white font-bold transition hover:opacity-90 shadow-xl shadow-primary/20">
                    Talk to Enterprise Sales
                    <ChevronRight className="w-5 h-5" />
                  </a>
                </div>
             </div>
           </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
