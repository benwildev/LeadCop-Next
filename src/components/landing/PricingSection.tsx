import Link from "next/link";
import { Check } from "lucide-react";
import { LandingPlan } from "@/lib/api";

const BRAND = "#FF751F";

export function PricingSection({ plans }: { plans: LandingPlan[] }) {
  if (!plans.length) {
    return (
      <section id="pricing" className="border-y border-primary/10 bg-slate-100/50 py-28">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900">Pricing information is currently unavailable.</h2>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="border-y border-primary/10 bg-slate-100/50 py-28">
      <div className="text-center mb-16 max-w-xl mx-auto px-6">
        <p className="text-[12px] font-bold tracking-[0.2em] uppercase mb-3 text-primary">
          Simple Pricing
        </p>
        <h2 className="text-4xl font-bold tracking-tight text-slate-900">
          Scale as you grow.
        </h2>
        <p className="mt-5 text-lg text-slate-500">
          Transparent pricing for teams of all sizes.
        </p>
      </div>

      <div className="max-w-6xl w-full mx-auto px-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((cfg) => {
            const isBasic = cfg.plan === "BASIC";
            const isFree = cfg.plan === "FREE";
            const isCustom = cfg.plan === "CUSTOM" || cfg.plan === "ENTERPRISE";
            const highlighted = isBasic;

            return (
              <div
                key={cfg.plan}
                className="brand-card relative flex flex-col rounded-2xl p-7"
                style={
                  highlighted
                    ? {
                        borderColor: BRAND,
                        borderWidth: "2px",
                        boxShadow: `0 24px 60px ${BRAND}24`,
                      }
                    : {}
                }
              >
                {highlighted && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-[9px] font-bold uppercase tracking-[0.18em] px-3.5 py-1 rounded-full"
                    style={{ background: BRAND }}
                  >
                    Most Popular
                  </div>
                )}

                <p className="text-[10px] font-bold tracking-[0.28em] uppercase mb-5 text-slate-400">
                  {isCustom ? "Custom" : cfg.plan.charAt(0) + cfg.plan.slice(1).toLowerCase()}
                </p>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold tracking-tight text-slate-900">
                    {isCustom ? "Custom" : `$${cfg.price}`}
                  </span>
                  {!isCustom && <span className="text-sm text-slate-400">/mo</span>}
                </div>

                <p className="text-xs mb-7 text-slate-400">
                  {cfg.requestLimit >= 1000000000 || cfg.requestLimit === -1
                    ? "Unlimited checks"
                    : `${cfg.requestLimit.toLocaleString()} checks/mo`}
                </p>

                <ul className="space-y-3 flex-1 border-t border-slate-50 pt-6">
                  {cfg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="shrink-0 mt-0.5 text-primary" size={14} strokeWidth={3} />
                      <span className="text-[13px] font-medium text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  {isCustom ? (
                    <a href="mailto:support@leadcop.io" className="block">
                      <button
                        className="brand-button-secondary w-full py-3 text-xs font-semibold uppercase tracking-[0.08em]"
                        style={{
                          background: "transparent",
                        }}
                      >
                        Contact Sales
                      </button>
                    </a>
                  ) : (
                    <Link href="/signup" className="block">
                      <button
                        className="w-full rounded-xl py-3 text-xs font-semibold uppercase tracking-[0.08em] transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-0"
                        style={
                          highlighted
                            ? {
                                background: BRAND,
                                color: "#fff",
                              }
                            : {
                                background: "#111827",
                                color: "#fff",
                              }
                        }
                      >
                        {isFree ? "Get Started" : "Buy Now"}
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
