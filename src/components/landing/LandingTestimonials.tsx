import { Star } from "lucide-react";
import { LandingTestimonial } from "@/lib/api";

export function LandingTestimonials({ testimonials }: { testimonials: LandingTestimonial[] }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-32">
      <h2 className="text-center font-display text-3xl font-bold text-slate-900 mb-16">
        Trusted by growth leaders
      </h2>
      <div className="grid gap-8 md:grid-cols-3">
        {testimonials.map((item) => (
          <div key={item.name} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
            <div className="mb-6 flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-[15px] leading-relaxed text-slate-600">"{item.quote}"</p>
            <div className="mt-8 border-t border-slate-100 pt-6">
              <p className="text-[14px] font-bold text-slate-900">{item.name}</p>
              <p className="text-[12px] font-semibold text-primary">{item.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
