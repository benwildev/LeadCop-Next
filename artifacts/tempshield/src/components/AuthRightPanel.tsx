import { Shield, Zap, Lock, Users, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Zap,
    title: "Real-time detection",
    desc: "Flag disposable emails before the user submits the form.",
  },
  {
    icon: Lock,
    title: "100K+ blocked domains",
    desc: "Covers Mailinator, Guerrilla Mail, 10MinuteMail and thousands more.",
  },
  {
    icon: Users,
    title: "Trusted by 10,000+ developers",
    desc: "From indie makers to enterprise teams protecting millions of signups.",
  },
];

const stats = [
  { value: "99.9%", label: "Accuracy" },
  { value: "<50ms", label: "Response" },
  { value: "100K+", label: "Domains" },
];

const fadeUp: any = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: "easeOut", delay: i * 0.08 },
  }),
};

export default function AuthRightPanel() {
  return (
    <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-gray-50 via-slate-100 to-gray-200 items-center justify-center px-12 py-8">
      {/* Glow orbs */}
      <div className="absolute bottom-0 right-0 w-[560px] h-[560px] translate-x-1/3 translate-y-1/3 rounded-full bg-gradient-to-tl from-purple-400/50 via-pink-300/30 to-transparent blur-[80px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/3 w-[260px] h-[260px] rounded-full bg-gradient-to-br from-violet-300/25 to-transparent blur-[55px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <motion.div
          custom={0} variants={fadeUp} initial="hidden" animate="show"
          className="flex items-center gap-3 mb-7"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-md shadow-purple-500/30 flex-shrink-0">
            <Shield className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
          </div>
          <span className="font-heading text-lg font-bold text-gray-800">TempShield</span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          custom={1} variants={fadeUp} initial="hidden" animate="show"
          className="font-heading text-2xl font-bold text-gray-900 leading-snug mb-2"
        >
          Stop fake signups<br />before they start.
        </motion.h2>
        <motion.p
          custom={2} variants={fadeUp} initial="hidden" animate="show"
          className="text-sm text-gray-500 mb-7 leading-relaxed"
        >
          TempShield detects disposable email addresses in real time, keeping your user base clean and your metrics trustworthy.
        </motion.p>

        {/* Feature list */}
        <ul className="space-y-4 mb-7">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.li
              key={title}
              custom={i + 3} variants={fadeUp} initial="hidden" animate="show"
              className="flex items-start gap-3"
            >
              <div className="mt-0.5 w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </motion.li>
          ))}
        </ul>

        {/* Stats row */}
        <motion.div
          custom={6} variants={fadeUp} initial="hidden" animate="show"
          className="flex items-center gap-5 pt-5 border-t border-gray-200"
        >
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="font-heading text-lg font-bold text-purple-700">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            Free plan — no card required
          </div>
        </motion.div>
      </div>
    </div>
  );
}
