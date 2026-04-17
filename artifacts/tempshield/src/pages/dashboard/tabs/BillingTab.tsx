import React from "react";
import { CreditCard, Loader2, FileText, Download, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";

type BillingRequest = {
  id: number;
  planRequested: string;
  status: string;
  note?: string | null;
  hasInvoice: boolean;
  invoiceFileName?: string | null;
  invoiceUploadedAt?: string | null;
  createdAt: string;
};

const PLAN_BADGE: Record<string, string> = {
  BASIC: "bg-blue-500/15 text-blue-400",
  PRO: "bg-primary/15 text-primary",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400",
  APPROVED: "bg-green-500/15 text-green-400",
  REJECTED: "bg-red-500/15 text-red-400",
};

export default function BillingTab() {
  const [billingData, setBillingData] = React.useState<{ requests: BillingRequest[] } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState("");

  React.useEffect(() => {
    fetch("/api/user/billing", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setBillingData(d); setLoading(false); })
      .catch(() => { setFetchError("Failed to load billing history"); setLoading(false); });
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-semibold text-foreground">Billing History</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Your subscription requests and any invoices attached to approved upgrades.
        </p>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : fetchError ? (
          <p className="text-center text-sm text-red-400 py-6">{fetchError}</p>
        ) : !billingData || billingData.requests.length === 0 ? (
          <div className="text-center py-10">
            <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No approved upgrades yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Invoices appear here once your upgrade request is approved.</p>
            <Link href="/upgrade" className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline">
              Request an upgrade <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {billingData.requests.map(req => (
              <div key={req.id} className="flex items-start justify-between gap-4 px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${PLAN_BADGE[req.planRequested] ?? "bg-muted text-muted-foreground"}`}>
                      {req.planRequested}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${STATUS_BADGE[req.status] ?? "bg-muted text-muted-foreground"}`}>
                      {req.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{format(parseISO(req.createdAt), "PP")}</span>
                  </div>
                  {req.note && (
                    <p className="text-xs text-muted-foreground italic mt-1 truncate">"{req.note}"</p>
                  )}
                  {req.hasInvoice && req.status === "APPROVED" && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground truncate">{req.invoiceFileName ?? "invoice.pdf"}</span>
                      {req.invoiceUploadedAt && (
                        <span className="text-xs text-muted-foreground">· {format(parseISO(req.invoiceUploadedAt), "PP")}</span>
                      )}
                    </div>
                  )}
                </div>
                {req.hasInvoice && req.status === "APPROVED" && (
                  <a
                    href={`/api/user/invoice/${req.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium"
                    title="Download Invoice"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Invoice
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
