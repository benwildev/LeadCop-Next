"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CreditCard, Settings, Key, Database, Shield,
  ChevronLeft, ChevronRight, ArrowLeft, Menu, TrendingUp, Globe, Mail,
  Send, Image, Tag, FileText, MessageSquare, Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { Logo } from "@/components/Logo";

export type Section =
  | "overview" | "users" | "subscriptions" | "plan-config" | "api-keys"
  | "domains" | "payment" | "email" | "revenue" | "branding" | "seo"
  | "support" | "blog" | "newsletter" | "system-status";

export const NAV_GROUPS: {
  label: string;
  items: { id: Section; label: string; icon: React.ElementType }[];
}[] = [
    {
      label: "",
      items: [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
      ],
    },
    {
      label: "Users & Billing",
      items: [
        { id: "users", label: "Users", icon: Users },
        { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
        { id: "plan-config", label: "Plan Config", icon: Settings },
        { id: "revenue", label: "Revenue", icon: TrendingUp },
      ],
    },
    {
      label: "Platform",
      items: [
        { id: "payment", label: "Payment", icon: Globe },
        { id: "email", label: "Email", icon: Mail },
        { id: "branding", label: "Branding", icon: Image },
        { id: "seo", label: "SEO", icon: Tag },
      ],
    },
    {
      label: "Content",
      items: [
        { id: "blog", label: "Blog", icon: FileText },
        { id: "newsletter", label: "Newsletter", icon: Send },
        { id: "support", label: "Support", icon: MessageSquare },
      ],
    },
    {
      label: "Developer",
      items: [
        { id: "api-keys", label: "API Keys", icon: Key },
        { id: "domains", label: "Domain DB", icon: Database },
        { id: "system-status", label: "System Status", icon: Activity },
      ],
    },
  ];

const ADMIN_ACCENT = "#7a719d";
const ADMIN_ACCENT_LIGHT = "#9990b8";

function SidebarContent({
  active, collapsed, onToggle, onClose, layoutIdPrefix,
}: {
  active: Section;
  collapsed: boolean;
  onToggle: () => void;
  onClose: () => void;
  layoutIdPrefix: string;
}) {
  const siteSettings = useSiteSettings();
  const [faviconError, setFaviconError] = React.useState(false);

  return (
    <div className="flex flex-col h-full" style={{
      background: "linear-gradient(180deg, #5c5480 0%, #4a4370 30%, #3d376a 60%, #2e2956 100%)",
      borderRight: "1px solid rgba(122, 113, 157, 0.25)",
    }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        {collapsed ? (
          siteSettings.faviconUrl && !faviconError ? (
            <img
              src={siteSettings.faviconUrl ?? undefined}
              alt={siteSettings.siteTitle}
              className="h-8 w-8 object-contain rounded-md mx-auto flex-shrink-0 invert dark:invert-0"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto flex-shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, ${ADMIN_ACCENT}, ${ADMIN_ACCENT_LIGHT})` }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
          )
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ background: `linear-gradient(135deg, ${ADMIN_ACCENT}, ${ADMIN_ACCENT_LIGHT})` }}>
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white tracking-tight">Admin Panel</p>
                <p className="text-[10px] font-medium" style={{ color: ADMIN_ACCENT_LIGHT }}>LeadCop.io</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer text-white/60 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto no-scrollbar">
        {NAV_GROUPS.map(({ label, items }, gi) => (
          <div key={label || "top"} className="mb-2">
            {!collapsed && label && (
              <div className="px-5 pt-3 pb-1">
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-white/30">
                  {label}
                </span>
              </div>
            )}
            {collapsed && gi > 0 && <div className="mx-3 my-1.5 border-t border-white/10" />}
            <div className="px-2 space-y-0.5">
              {items.map(({ id, label: itemLabel, icon: Icon }) => {
                const isActive = active === id;
                const href = id === "overview" ? "/admin" : `/admin/${id}`;
                
                return (
                  <Link
                    key={id}
                    href={href}
                    onClick={onClose}
                    className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${collapsed ? "justify-center" : ""} ${
                      isActive ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"
                    }`}
                    title={collapsed ? itemLabel : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId={`${layoutIdPrefix}-active`}
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                        style={{ background: ADMIN_ACCENT }}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-[#9990b8]" : ""}`} />
                    {!collapsed && <span className="truncate">{itemLabel}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-white/10">
        {collapsed ? (
          <button
            onClick={onToggle}
            className="w-full flex justify-center p-2 rounded-lg transition-colors cursor-pointer text-white/60 hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <Link
            href="/dashboard"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer text-white/60 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        )}
      </div>
    </div>
  );
}

export function AdminSidebar({
  active, collapsed, onToggle, mobileOpen, onMobileClose,
}: {
  active: Section;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  return (
    <>
      <div className={`hidden lg:flex flex-col flex-shrink-0 h-full transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}>
        <SidebarContent active={active} collapsed={collapsed} onToggle={onToggle} onClose={() => { }} layoutIdPrefix="desktop" />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onMobileClose}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              key="drawer"
              initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 z-50 shadow-2xl"
            >
              <SidebarContent active={active} collapsed={false} onToggle={onToggle} onClose={onMobileClose} layoutIdPrefix="mobile" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
