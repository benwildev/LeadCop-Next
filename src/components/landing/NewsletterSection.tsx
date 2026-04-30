import { NewsletterForm } from "@/components/landing/NewsletterForm";

export function NewsletterSection() {
  return (
    <section className="bg-primary">
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/60">Newsletter</p>
        <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-white">
          Practical notes on lead quality.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/70">
          Weekly product updates, anti-spam tactics, and lessons from teams cleaning up acquisition funnels.
        </p>
        <div className="mx-auto mt-10 max-w-xl p-8 rounded-3xl bg-white/5 border border-white/10">
          <NewsletterForm />
        </div>
      </div>
    </section>
  );
}
