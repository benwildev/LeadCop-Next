import Image from "next/image";
import { ShieldCheck, Zap, BarChart3, Check } from "lucide-react";
import { LandingBenefit, LandingFeature } from "@/lib/api";

const ICON_MAP = {
  shield: ShieldCheck,
  zap: Zap,
  "bar-chart": BarChart3,
} as const;

export function LandingFeatures({
  features,
  benefits,
}: {
  features: LandingFeature[];
  benefits: LandingBenefit[];
}) {
  return (
    <section id="features" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Built for modern growth teams.
            </h2>
            <div className="mt-12 space-y-8">
              {benefits.map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-3xl bg-white p-4 shadow-2xl shadow-primary/5">
            <Image
              src="/images/opengraph.jpg"
              alt="LeadCop Dashboard Interface"
              width={960}
              height={640}
              className="rounded-2xl border border-slate-100 shadow-sm object-cover"
              priority
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Core features that keep fake signups out and clean leads in.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-500">
            LeadCop uses real-time verification, disposable email detection, and smart scoring so your acquisition funnel stays high-quality.
          </p>
        </div>
        <div className="grid gap-16 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = ICON_MAP[feature.icon];
            return (
              <div key={feature.title} className="group">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-primary transition group-hover:bg-primary group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-[18px] font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-500">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
