"use client";

import React, { useState } from "react";
import { 
  Copy, Check, Terminal, HelpCircle, AlertCircle, 
  CheckCircle2, ChevronDown 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl" style={{ background: "#0f1117" }}>
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: "#1a1d27", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
          </div>
          <div className="flex items-center gap-1.5">
            <Terminal className="h-3 w-3" style={{ color: "#6b7280" }} />
            <span className="text-xs font-medium" style={{ color: "#6b7280" }}>{lang}</span>
          </div>
        </div>
        <button
          onClick={() => { 
            navigator.clipboard.writeText(code); 
            setCopied(true); 
            setTimeout(() => setCopied(false), 2000); 
          }}
          className="text-slate-400 transition-colors hover:text-slate-100"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-xs leading-relaxed whitespace-pre" style={{ color: "#a5d6ff" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-primary text-xs font-mono">
      {children}
    </code>
  );
}

export function Callout({ type, children }: { type: "info" | "warning" | "tip"; children: React.ReactNode }) {
  const styles = {
    info: { bg: "bg-blue-50 border-blue-200", icon: <HelpCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />, text: "text-blue-700" },
    warning: { bg: "bg-amber-50 border-amber-200", icon: <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />, text: "text-amber-700" },
    tip: { bg: "bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />, text: "text-emerald-700" },
  }[type];
  return (
    <div className={`flex gap-3 rounded-xl border p-4 ${styles.bg}`}>
      {styles.icon}
      <p className={`text-sm leading-relaxed ${styles.text}`}>{children}</p>
    </div>
  );
}

export function FAQItem({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold text-slate-800 hover:text-primary transition-colors"
      >
        {q}
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-sm text-slate-500 leading-relaxed">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
