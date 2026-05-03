"use client";

import React, { useState } from "react";
import { Copy } from "lucide-react";

export function CodeSnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-primary/20 bg-slate-950 shadow-xl shadow-primary/10">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <span className="text-xs uppercase tracking-[0.2em] text-primary">Install snippet</span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-white/60 transition hover:bg-primary/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 text-xs leading-6 text-emerald-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function FeatureCard({
  icon,
  title,
  description,
  preview,
  buttonText,
  primary,
  wide,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  preview?: {
    email: string;
    details: { label: string; value: string }[];
    badge: { text: string; tone: "red" | "orange" | "emerald" | "amber" | "sky" };
    dot: string;
  };
  buttonText?: string;
  primary?: boolean;
  wide?: boolean;
}) {
  const dotColors = {
    red: "bg-red-500",
    orange: "bg-orange-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    sky: "bg-sky-500",
  };

  return (
    <div
      className={`brand-card group/card relative flex h-full flex-col overflow-hidden rounded-2xl p-6 ${wide ? "lg:col-span-3 md:col-span-2" : ""}`}
    >
      <div className={`flex flex-col flex-1 ${wide ? "lg:flex-row lg:items-center lg:justify-between lg:gap-12" : ""}`}>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary transition-all group-hover/card:bg-primary group-hover/card:text-white">
              {icon}
            </div>
            <h3 className="text-[17px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {title}
              {wide && <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm shadow-primary/20">New</span>}
            </h3>
          </div>

          <p className={`text-[15px] leading-relaxed text-slate-600 ${wide ? "mb-6 max-w-xl" : "mb-6"}`}>
            {description}
          </p>

          {preview && (
            <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-4 font-mono text-[11px] transition-colors group-hover/card:border-primary/15 group-hover/card:bg-primary/5">
              <div className="mb-3 flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${dotColors[preview.badge.tone]}`} />
                <span className="text-slate-400 font-bold uppercase tracking-wider">Input: {preview.email}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {preview.details.map((d) => (
                  <div key={d.label}>
                    <span className="text-slate-400 font-medium">{d.label}: </span>
                    <span className={d.value === "true" || d.value === "false" || d.value.includes('"') ? "text-primary font-bold" : "text-slate-600"}>
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {buttonText && (
          <div className={`${wide ? "lg:w-48 mt-6 lg:mt-0" : "mt-auto"}`}>
            <button
              className={`w-full py-2.5 px-4 rounded-xl text-[14px] font-bold border transition ${primary
                ? "border-primary bg-primary text-white hover:bg-[#e65f0b] hover:shadow-lg hover:shadow-primary/20"
                : "border-primary/20 bg-white text-slate-700 hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                }`}
            >
              {buttonText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
