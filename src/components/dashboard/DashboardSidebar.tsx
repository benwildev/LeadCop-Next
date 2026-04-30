import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Logo, LogoIcon } from "@/components/Logo";
import {
  BarChart3, TrendingUp, Key, Webhook, ShieldBan, ListFilter,
  CreditCard, Globe, MessageSquare, Users, ArrowUpRight,
  LogOut, Menu, X, FileSpreadsheet, ChevronLeft, Settings, User, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type DashboardTab =
  | "overview" | "analytics" | "keys" | "webhooks" | "blocklist"
  | "team" | "bulk" | "audit" | "billing" | "settings" | "profile";

interface NavItem {
  id: DashboardTab;
  label: string;
  icon: React.ElementType;
  group: "main" | "manage" | "account";
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: BarChart3, group: "main" },
  { id: "analytics", label: "Analytics", icon: TrendingUp, group: "main" },
  { id: "bulk", label: "Bulk Validation", icon: FileSpreadsheet, group: "main" },
  { id: "keys", label: "API Keys", icon: Key, group: "manage" },
  { id: "webhooks", label: "Webhooks", icon: Webhook, group: "manage" },
  { id: "blocklist", label: "Blocklist", icon: ShieldBan, group: "manage" },
  { id: "team", label: "Team", icon: Users, group: "manage" },
  { id: "audit", label: "Audit Log", icon: ListFilter, group: "account" },
  { id: "billing", label: "Billing", icon: CreditCard, group: "account" },
  { id: "settings", label: "Settings", icon: Globe, group: "account" },
  { id: "profile", label: "Profile", icon: User, group: "account" },
];

const GROUP_LABELS: Record<string, string> = {
  main: "Dashboard",
  manage: "Manage",
  account: "Account",
};

interface Props {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  usagePct?: number;
  requestCount?: number;
  requestLimit?: number;
  plan?: string;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export function DashboardSidebar({ 
  activeTab, 
  onTabChange, 
  usagePct = 0, 
  requestCount = 0, 
  requestLimit = 0, 
  plan = "FREE",
  collapsed = false,
  onCollapse
}: Props) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [actionsExpanded, setActionsExpanded] = useState(true);

  const planColors: Record<string, string> = {
    FREE: "bg-slate-500/15 text-slate-400",
    BASIC: "bg-blue-500/15 text-blue-400",
    PRO: "bg-primary/15 text-primary",
    ENTERPRISE: "bg-amber-500/15 text-amber-400",
  };

  const groups = ["main", "manage", "account"] as const;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo & collapse */}
      <div className={`flex items-center justify-between px-5 h-16 shrink-0 border-b border-border/50 ${collapsed ? "px-3" : ""}`}>
        {!collapsed && (
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
            <Logo size={30} />
          </Link>
        )}
        <button
          onClick={() => onCollapse?.(!collapsed)}
          className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* User info */}
      {!collapsed && (
        <div className="px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden group">
              {(user as any)?.avatarUrl ? (
                <img src={(user as any).avatarUrl} alt={user?.name || ""} className="h-full w-full object-cover" />
              ) : (
                <LogoIcon size={24} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{user?.name ?? "User"}</p>
              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${planColors[plan] ?? planColors.FREE}`}>
                {plan}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
        {groups.map(group => {
          const items = NAV_ITEMS.filter(i => i.group === group);
          return (
            <div key={group}>
              {!collapsed && (
                <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {GROUP_LABELS[group]}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(({ id, label, icon: Icon }) => {
                  const isActive = activeTab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => { onTabChange(id); setMobileOpen(false); }}
                      className={`relative w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer group ${
                        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"
                      } ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                      title={collapsed ? label : undefined}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} transition-colors`} />
                      {!collapsed && <span>{label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Usage gauge */}
      {!collapsed && (
        <div className="px-5 py-4 border-t border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-muted-foreground">Credits Used</span>
            <span className="text-[11px] font-bold text-foreground">
              {requestLimit === -1 ? "∞" : `${Math.round(usagePct)}%`}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${
                requestLimit === -1 ? "bg-primary" : (usagePct > 90 ? "bg-red-500" : usagePct > 70 ? "bg-amber-500" : "bg-primary")
              }`}
              style={{ width: `${requestLimit === -1 ? 0 : usagePct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {requestCount.toLocaleString()} / {requestLimit === -1 ? "Unlimited" : requestLimit.toLocaleString()}
          </p>
        </div>
      )}

      {/* Bottom actions */}
      <div className="border-t border-border/50">
        {!collapsed && (
          <button
            onClick={() => setActionsExpanded(!actionsExpanded)}
            className="w-full px-5 py-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-foreground transition-colors group"
          >
            <span>Quick Actions</span>
            <ChevronLeft className={`h-3 w-3 transition-transform duration-200 ${actionsExpanded ? "-rotate-90" : "rotate-0"}`} />
          </button>
        )}
        
        <div className={`px-3 py-2 space-y-1 overflow-hidden transition-all duration-300 ${!collapsed && !actionsExpanded ? "max-h-0 py-0 opacity-0" : "max-h-64 opacity-100"}`}>
          <Link
            href="/support"
            className={`flex items-center gap-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer ${
              collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"
            }`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Support</span>}
          </Link>
          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                collapsed ? "justify-center px-2 py-2.5 bg-amber-500/10 text-amber-500" : "px-3 py-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
              }`}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Admin Panel</span>}
            </Link>
          )}
          <Link
            href="/upgrade"
            className={`flex items-center gap-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              collapsed ? "justify-center px-2 py-2.5 bg-primary/10 text-primary" : "px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20"
            }`}
          >
            <ArrowUpRight className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Upgrade Plan</span>}
          </Link>
        </div>
        
        <div className="px-3 py-2 border-t border-border/50">
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer ${
              collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 h-10 w-10 flex items-center justify-center rounded-xl bg-background border border-border shadow-sm text-foreground"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-background border-r border-border z-50 overflow-hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 bg-background border-r border-border z-30 transition-all duration-200 ${
          collapsed ? "w-[68px]" : "w-[260px]"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
