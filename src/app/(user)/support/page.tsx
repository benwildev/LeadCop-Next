"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Plus, MessageSquare, ChevronRight, Loader2,
  Clock, CheckCircle2, XCircle, PlayCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import Layout from "@/components/layout/Layout";
import { axiosSecure } from "@/lib/api-client-react";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  category: string;
  updatedAt: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; icon: any; cls: string }> = {
  open: { label: "Open", icon: Clock, cls: "bg-blue-500/10 text-blue-500" },
  in_progress: { label: "In Progress", icon: PlayCircle, cls: "bg-amber-500/10 text-amber-500" },
  resolved: { label: "Resolved", icon: CheckCircle2, cls: "bg-green-500/10 text-green-500" },
  closed: { label: "Closed", icon: XCircle, cls: "bg-slate-500/10 text-slate-500" },
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  billing: "Billing",
  technical: "Technical",
  feature: "Feature Request",
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function SupportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | TicketStatus>("all");

  const { data, isLoading } = useQuery<{ tickets: Ticket[] }>({
    queryKey: ["/api/support/tickets"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/support/tickets");
      return response.data;
    },
    enabled: !!user,
  });

  const tickets = (data?.tickets ?? []).filter(t =>
    filter === "all" ? true : t.status === filter
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Support</h1>
            <p className="text-muted-foreground mt-1 text-sm">Track and manage your support requests.</p>
          </div>
          <Link href="/support/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            New Ticket
          </Link>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "open", "in_progress", "resolved", "closed"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : STATUS_CONFIG[f as TicketStatus].label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 glass-card rounded-2xl"
          >
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No tickets yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              {filter === "all" ? "Create a ticket and our team will get back to you." : `No ${STATUS_CONFIG[filter as TicketStatus]?.label.toLowerCase()} tickets.`}
            </p>
            {filter === "all" && (
              <Link href="/support/new" className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors inline-block">
                Create your first ticket
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket, i) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  onClick={() => router.push(`/support/${ticket.id}`)}
                  className="w-full glass-card rounded-xl px-5 py-4 flex items-center justify-between hover:border-primary/40 transition-all group text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={ticket.status} />
                      <span className="text-xs text-muted-foreground capitalize">
                        {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                      </span>
                    </div>
                    <p className="font-medium text-foreground truncate">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Updated {format(parseISO(ticket.updatedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 ml-3" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
