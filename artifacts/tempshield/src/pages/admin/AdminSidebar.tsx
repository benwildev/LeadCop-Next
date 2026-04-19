import React from "react";
import { Link } from "wouter";
import {
  LayoutDashboard, Users, CreditCard, Settings, Key, Database, Shield,
  ChevronLeft, ChevronRight, ArrowLeft, Menu, TrendingUp, Globe, Mail,
  Send, Image, Tag, FileText, MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteSettings } from "@/hooks/use-site-settings";

export type Section =
  | "overview" | "users" | "subscriptions" | "plan-config" | "api-keys"
  | "domains" | "payment" | "email" | "revenue" | "branding" | "seo"
  | "support" | "blog" | "newsletter";

export const NAV_GROUPS: {
  label: string;
  items: { id: Section; label: string; icon: React.ElementType }[];
}[] = [
  {
    label: "Analytics",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "revenue", label: "Revenue", icon: TrendingUp },
    ],
  },
  {
    label: "Users",
    items: [
      { id: "users", label: "Users", icon: Users },
      { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
    ],
  },
  {
    label: "Configuration",
    items: [
      { id: "plan-config", label: "Plan Config", icon: Settings },
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
    ],
  },
  {
    label: "System",
    items: [
      { id: "api-keys", label: "API Keys", icon: Key },
      { id: "domains", label: "Domain DB", icon: Database },
      { id: "support", label: "Support", icon: MessageSquare },
    ],
  },
];

function SidebarContent({
  active, onNav, collapsed, onToggle, onClose,
}: {
  active: Section;
  onNav: (s: Section) => void;
  collapsed: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const siteSettings = useSiteSettings();
  const [logoError, setLogoError] = React.useState(false);
  const [faviconError, setFaviconError] = React.useState(false);

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        {collapsed ? (
          siteSettings.faviconUrl && !faviconError ? (
            <img
              src={siteSettings.faviconUrl ?? undefined}
              alt={siteSettings.siteTitle}
              className="h-8 w-8 object-contain rounded-md mx-auto flex-shrink-0 invert dark:invert-0"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mx-auto flex-shrink-0 shadow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
          )
        ) : (
          <>
            {siteSettings.logoUrl && !logoError ? (
              <img
                src={siteSettings.logoUrl ?? undefined}
                alt={siteSettings.siteTitle}
                className="h-auto w-full max-w-[160px] object-contain invert dark:invert-0 flex-shrink-0"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Shield className="w-4 h-4 text-white" />
              </div>
            )}
            <button
              onClick={onToggle}
              className="hidden lg:flex text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/50 flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 py-2 overflow-y-auto no-scrollbar">
        {NAV_GROUPS.map(({ label, items }) => (
          <div key={label} className="mb-1">
            {!collapsed && (
              <div className="px-4 pt-2 pb-0.5">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50">
                  {label}
                </span>
              </div>
            )}
            {collapsed && <div className="mx-4 my-1 border-t border-border/50" />}
            <div className="px-2">
              {items.map(({ id, label: itemLabel, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { onNav(id); onClose(); }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    active === id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  } ${collapsed ? "justify-center" : ""}`}
                  title={collapsed ? itemLabel : undefined}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active === id ? "text-primary" : ""}`} />
                  {!collapsed && <span className="truncate">{itemLabel}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-border">
        {collapsed ? (
          <button
            onClick={onToggle}
            className="w-full flex justify-center p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <Link
            href="/dashboard"
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
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
  active, onNav, collapsed, onToggle, mobileOpen, onMobileClose,
}: {
  active: Section;
  onNav: (s: Section) => void;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  return (
    <>
      <div className={`hidden lg:flex flex-col flex-shrink-0 h-full transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}>
        <SidebarContent active={active} onNav={onNav} collapsed={collapsed} onToggle={onToggle} onClose={() => {}} />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onMobileClose}
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              key="drawer"
              initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 z-50 shadow-2xl"
            >
              <SidebarContent active={active} onNav={onNav} collapsed={false} onToggle={onToggle} onClose={onMobileClose} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
