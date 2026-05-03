"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Menu, X, ArrowRight } from "lucide-react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? "bg-white/90 border-b border-primary/10 py-3 shadow-sm backdrop-blur-xl" 
          : "bg-transparent py-5"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
          <Logo size={40} />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-10 text-[14px] font-semibold text-slate-600 lg:flex">
          <Link href="/#product" className="transition-colors hover:text-primary">Features</Link>
          <Link href="/#how" className="transition-colors hover:text-primary">How it works</Link>
          <Link href="/pricing" className="transition-colors hover:text-primary">Pricing</Link>
          <Link href="/docs" className="transition-colors hover:text-primary">Docs</Link>
          <Link href="/blog" className="transition-colors hover:text-primary">Blog</Link>
        </div>

        <div className="hidden items-center gap-6 lg:flex">
          <Link href="/login" className="text-[14px] font-semibold text-slate-600 hover:text-slate-900 transition-colors">
            Log in
          </Link>
        <Link
          href="/signup"
          className="brand-button px-6 py-2.5 text-[14px] font-semibold"
        >
          Start free
        </Link>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div 
        className={`lg:hidden absolute top-full left-0 w-full bg-white border-b border-slate-100 transition-[max-height] duration-200 overflow-hidden ${
          isOpen ? "max-h-[500px] py-8 shadow-2xl" : "max-h-0"
        }`}
      >
        <div className="px-6 flex flex-col gap-6">
          {[
            { name: "Features", href: "/#product" },
            { name: "How it works", href: "/#how" },
            { name: "Pricing", href: "/pricing" },
            { name: "Docs", href: "/docs" },
            { name: "Blog", href: "/blog" },
          ].map((item) => (
            <Link 
              key={item.name} 
              href={item.href} 
              onClick={() => setIsOpen(false)}
              className="group flex items-center justify-between rounded-xl px-2 py-1 text-lg font-bold text-slate-900 transition-colors hover:bg-primary/5 hover:text-primary"
            >
              {item.name}
              <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-opacity" />
            </Link>
          ))}
          <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
            <Link href="/login" className="rounded-xl py-3 text-center font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-primary">Log in</Link>
            <Link
              href="/signup"
              className="brand-button w-full px-6 py-4 text-center font-bold"
            >
              Start for free
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
