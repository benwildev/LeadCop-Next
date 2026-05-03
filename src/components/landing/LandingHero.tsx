import Link from "next/link";
import { ArrowRight, Play, Zap } from "lucide-react";

export function LandingHero() {
  return (
    <header className="mx-auto max-w-5xl px-6 py-20 text-center md:py-32">
      <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-1.5 text-[12px] font-bold tracking-widest text-primary border border-slate-100">
        <Zap className="h-3 w-3" />
        NOW POWERING 2,400+ SIGNUP FORMS
      </span>

      <h1 className="mt-8 font-display text-5xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Stop disposable emails <br className="hidden md:block" />
        <span className="text-primary">and clean up your lead data.</span>
      </h1>

      <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-500">
        LeadCop instantly identifies temporary email providers, bot traffic, and low-quality leads before they ever reach your CRM or inbox.
      </p>

      <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
        <Link
          href="/signup"
          className="brand-button w-full px-8 py-5 text-[16px] font-bold sm:w-auto"
        >
          Start protecting for free
          <ArrowRight className="h-4 w-4" />
        </Link>

        <a
          href="#demo"
          className="brand-button-secondary w-full px-8 py-5 text-[16px] font-bold sm:w-auto"
        >
          <Play className="h-4 w-4 fill-slate-900" />
          See it in action
        </a>
      </div>
    </header>
  );
}
