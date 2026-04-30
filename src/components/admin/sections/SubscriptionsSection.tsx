import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Loader2,
  Check,
  X,
  CreditCard,
  TrendingUp,
  FileText,
  Download,
  Upload,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionHeader, GlassCard } from "@/components/shared";
import { axiosSecure } from "@/lib/api-client-react";

type UpgradeRequest = {
  id: number;
  userId: string;
  userEmail: string;
  userName: string | null;
  currentPlan: string;
  planRequested: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string | null;
  hasInvoice: boolean;
  invoiceKey?: string | null;
  invoiceFileName?: string | null;
  invoiceUploadedAt?: string | null;
  createdAt: string;
};

const PLAN_COLORS: Record<string, string> = {
  BASIC: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PRO: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  MAX: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ENTERPRISE: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

export function SubscriptionsSection() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ requests: UpgradeRequest[]; total: number }>({
    queryKey: ["/api/admin/upgrade-requests"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/admin/upgrade-requests");
      return response.data;
    },
  });

  const requests = data?.requests || [];

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      objectPath,
      fileName,
    }: {
      id: number;
      status: "APPROVED" | "REJECTED";
      objectPath?: string;
      fileName?: string;
    }) => {
      const response = await axiosSecure.patch(`/api/admin/upgrade-requests/${id}`, {
        status,
        objectPath,
        fileName,
      });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/upgrade-requests"] });
    },
  });

  const attachMutation = useMutation({
    mutationFn: async ({
      id,
      objectPath,
      fileName,
    }: {
      id: number;
      objectPath: string;
      fileName: string;
    }) => {
      const response = await axiosSecure.patch(`/api/admin/upgrade-requests/${id}`, {
        objectPath,
        fileName,
      });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/upgrade-requests"] });
    },
  });

  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [attachingId, setAttachingId] = useState<number | null>(null);
  const [approveFile, setApproveFile] = useState<File | null>(null);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [approveError, setApproveError] = useState("");
  const [attachError, setAttachError] = useState("");

  const handleApprove = async (id: number) => {
    if (!approveFile) {
      setApproveError("Please select an invoice file first.");
      return;
    }
    setApproveError("");
    try {
      const formData = new FormData();
      formData.append("file", approveFile);
      
      const { data } = await axiosSecure.post("/api/admin/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const objectPath = data.url;

      // 3. Update status
      await updateMutation.mutateAsync({
        id,
        status: "APPROVED",
        objectPath,
        fileName: approveFile.name,
      });
      setApprovingId(null);
    } catch (e: any) {
      setApproveError(e.message || "Failed to approve");
    }
  };

  const handleAttach = async (id: number) => {
    if (!attachFile) {
      setAttachError("Please select an invoice file first.");
      return;
    }
    setAttachError("");
    try {
      const formData = new FormData();
      formData.append("file", attachFile);
      
      const { data } = await axiosSecure.post("/api/admin/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const objectPath = data.url;

      // 3. Attach
      await attachMutation.mutateAsync({
        id,
        objectPath,
        fileName: attachFile.name,
      });
      setAttachingId(null);
    } catch (e: any) {
      setAttachError(e.message || "Failed to attach");
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Are you sure you want to reject this request?")) return;
    await updateMutation.mutateAsync({ id, status: "REJECTED" });
  };

  return (
    <div className="max-w-6xl pb-12">
      <SectionHeader
        title="Upgrade Requests"
        subtitle="Manage manual plan upgrade requests and billing invoices"
      />

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : requests?.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-2xl">
          <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No pending upgrade requests</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {requests?.map((req) => (
            <GlassCard key={req.id} rounded="rounded-xl" className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {req.userEmail[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {req.userEmail}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(parseISO(req.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-muted text-muted-foreground border border-border">
                  {req.currentPlan}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-bold border ${PLAN_COLORS[req.planRequested] || "bg-muted text-muted-foreground"}`}
                >
                  → {req.planRequested}
                </span>
              </div>

              {req.note && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mb-3 italic">
                  "{req.note}"
                </p>
              )}

              {approvingId === req.id ? (
                <div className="space-y-3 mt-auto pt-3 border-t border-border/50">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Attach Final Invoice (PDF/Image)</p>
                  <input
                    type="file"
                    onChange={(e) => setApproveFile(e.target.files?.[0] || null)}
                    className="text-xs w-full"
                    accept=".pdf,image/*"
                  />
                  {approveError && <p className="text-[10px] text-red-400">{approveError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="flex-1 py-1.5 bg-primary text-white rounded-lg text-xs font-bold"
                    >
                      Complete Approval
                    </button>
                    <button onClick={() => setApprovingId(null)} className="px-2 py-1.5 bg-muted rounded-lg text-xs">Cancel</button>
                  </div>
                </div>
              ) : attachingId === req.id ? (
                <div className="space-y-3 mt-auto pt-3 border-t border-border/50">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Upload Invoice</p>
                  <input
                    type="file"
                    onChange={(e) => setAttachFile(e.target.files?.[0] || null)}
                    className="text-xs w-full"
                    accept=".pdf,image/*"
                  />
                  {attachError && <p className="text-[10px] text-red-400">{attachError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAttach(req.id)}
                      className="flex-1 py-1.5 bg-primary text-white rounded-lg text-xs font-bold"
                    >
                      Upload
                    </button>
                    <button onClick={() => setAttachingId(null)} className="px-2 py-1.5 bg-muted rounded-lg text-xs">Cancel</button>
                  </div>
                </div>
              ) : req.status === "PENDING" ? (
                <div className="flex gap-2 mt-auto pt-3 border-t border-border/50">
                  <button
                    onClick={() => {
                      setApprovingId(req.id);
                      setApproveFile(null);
                      setApproveError("");
                    }}
                    disabled={updateMutation.isPending}
                    className="flex-1 py-2 bg-green-500/15 text-green-400 hover:bg-green-500/25 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={updateMutation.isPending}
                    className="flex-1 py-2 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              ) : (
                <div className="mt-auto pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${req.status === "APPROVED" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}
                    >
                      {req.status}
                    </span>
                    {req.status === "APPROVED" && (
                      <div className="flex items-center gap-1">
                         {req.hasInvoice && (
                            <a
                              href={req.invoiceKey || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              title="Download invoice"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                         )}
                         <button
                            onClick={() => {
                              setAttachingId(req.id);
                              setAttachFile(null);
                              setAttachError("");
                            }}
                            className="p-1 rounded-lg bg-muted/40 text-muted-foreground hover:bg-muted/60 transition-colors"
                            title={req.hasInvoice ? "Replace invoice" : "Attach invoice"}
                          >
                            <Upload className="h-3.5 w-3.5" />
                          </button>
                      </div>
                    )}
                  </div>
                  {req.hasInvoice && (
                     <div className="mt-2 flex items-center gap-1.5 overflow-hidden">
                        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-[10px] text-muted-foreground truncate">
                          {req.invoiceFileName ?? "invoice.pdf"}
                        </span>
                     </div>
                  )}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
