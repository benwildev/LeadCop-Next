import { ShieldCheck } from "lucide-react";
import EmailCheckForm from "@/components/features/EmailCheckForm";

export function LandingDemo() {
  return (
    <section id="demo" className="mx-auto max-w-4xl px-6 py-20">
      <div className="rounded-[40px] bg-slate-900 p-8 shadow-2xl shadow-primary/10 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShieldCheck className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 max-w-xl">
          <h2 className="font-display text-3xl font-bold text-white">Try the lead validator demo</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
            Paste any email address below to see how our proprietary detection engine classifies it in real-time.
          </p>
          <div className="mt-8">
            <EmailCheckForm />
          </div>
        </div>
      </div>
    </section>
  );
}
