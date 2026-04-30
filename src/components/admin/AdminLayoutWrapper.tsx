"use client";

import React, { useState } from "react";
import { LayoutDashboard, Shield, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminSidebar, type Section, NAV_GROUPS } from "./AdminSidebar";
import { usePathname } from "next/navigation";

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Determine active section from pathname
  const segments = pathname.split("/").filter(Boolean);
  // Expected segments: ["admin", "section", ...]
  const sectionFromPath = segments[1] as Section;
  
  const activeSection: Section = sectionFromPath || "overview";

  const allNavItems = NAV_GROUPS.flatMap((g) => g.items);
  const currentItem = allNavItems.find((i) => i.id === activeSection);
  const CurrentIcon = currentItem?.icon ?? LayoutDashboard;
  const currentLabel = currentItem?.label ?? "Admin";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar
        active={activeSection}
        collapsed={collapsed}
        onToggle={() => setCollapsed((p) => !p)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className="flex-1 overflow-y-auto min-w-0 bg-background">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-30 bg-card border-b border-border">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-1 rounded-lg transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <CurrentIcon className="w-4 h-4 flex-shrink-0" style={{ color: "#7a719d" }} />
            <span className="font-heading text-base font-semibold text-foreground truncate">{currentLabel}</span>
          </div>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0" style={{ background: "linear-gradient(135deg, #7a719d, #9990b8)" }}>
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Section content */}
        <div className={`${collapsed ? "max-w-7xl" : "max-w-5xl"} mx-auto px-4 sm:px-6 py-6 sm:py-8 transition-all duration-300`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
