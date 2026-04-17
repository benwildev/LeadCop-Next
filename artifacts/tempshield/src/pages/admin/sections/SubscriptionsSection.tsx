import { useState } from "react";
import {
  useAdminGetUpgradeRequests,
  useAdminUpdateUpgradeRequest,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Loader2,
  Check,
  X,
  Upload,
  Download,
  FileText,
  Paperclip,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeader } from "@/components/shared";
import { PLAN_COLORS } from "../constants";

type UpgradeRequestWithInvoice = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  planRequested: string;
  status: string;
  note?: string;
  hasInvoice: boolean;
  invoiceFileName?: string | null;
  invoiceUploadedAt?: string | null;
  createdAt: string;
};

async function requestInvoiceUploadUrl(
  requestId: number,
): Promise<{ uploadURL: string; objectPath: string }> {
  const resp = await fetch(
    `/api/admin/upgrade-requests/${requestId}/invoice/upload-url`,
    { method: "POST", credentials: "include" },
  );
  if (!resp.ok) throw new Error("Failed to get upload URL");
  return resp.json();
}

async function uploadToGcs(uploadURL: string, file: File): Promise<void> {
  const resp = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!resp.ok) throw new Error("Upload to storage failed");
}

async function attachInvoice(
  requestId: number,
  objectPath: string,
  fileName: string,
): Promise<void> {
  const resp = await fetch(`/api/admin/upgrade-requests/${requestId}/invoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ objectPath, fileName }),
  });
  if (!resp.ok) throw new Error("Failed to attach invoice");
}

export function SubscriptionsSection() {
  const qc = useQueryClient();
  const requestsQuery = useAdminGetUpgradeRequests();
  const updateMutation = useAdminUpdateUpgradeRequest();
  const [tab, setTab] = useState<"PENDING" | "ALL">("PENDING");

  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [approveFile, setApproveFile] = useState<File | null>(null);
  const [approveNote, setApproveNote] = useState("");
  const [approveUploading, setApproveUploading] = useState(false);
  const [approveError, setApproveError] = useState("");

  const [attachingId, setAttachingId] = useState<number | null>(null);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachUploading, setAttachUploading] = useState(false);
  const [attachError, setAttachError] = useState("");

  const requests = (
    (requestsQuery.data?.requests || []) as UpgradeRequestWithInvoice[]
  ).filter((r) => (tab === "PENDING" ? r.status === "PENDING" : true));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/admin/upgrade-requests"] });
    qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
    qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
  };

  const handleReject = async (id: number) => {
    await updateMutation.mutateAsync({
      requestId: id,
      data: { status: "REJECTED" },
    });
    invalidate();
  };

  const handleApprove = async () => {
    if (!approvingId) return;
    setApproveUploading(true);
    setApproveError("");
    try {
      const updateData: { status: "APPROVED"; note?: string } = {
        status: "APPROVED",
      };
      if (approveNote.trim()) updateData.note = approveNote.trim();
      await updateMutation.mutateAsync({
        requestId: approvingId,
        data: updateData,
      });
      if (approveFile) {
        const { uploadURL, objectPath } =
          await requestInvoiceUploadUrl(approvingId);
        await uploadToGcs(uploadURL, approveFile);
        await attachInvoice(approvingId, objectPath, approveFile.name);
      }
      invalidate();
      setApprovingId(null);
      setApproveFile(null);
      setApproveNote("");
    } catch (e) {
      setApproveError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setApproveUploading(false);
    }
  };

  const handleAttachInvoice = async () => {
    if (!attachingId || !attachFile) return;
    setAttachUploading(true);
    setAttachError("");
    try {
      const { uploadURL, objectPath } =
        await requestInvoiceUploadUrl(attachingId);
      await uploadToGcs(uploadURL, attachFile);
      await attachInvoice(attachingId, objectPath, attachFile.name);
      invalidate();
      setAttachingId(null);
      setAttachFile(null);
    } catch (e) {
      setAttachError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setAttachUploading(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Subscriptions"
        subtitle="Review and action upgrade requests"
      />

      <AnimatePresence>
        {approvingId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setApprovingId(null);
                setApproveFile(null);
                setApproveNote("");
                setApproveError("");
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-xl bg-green-500/15 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-400" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Approve Upgrade Request
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                You can optionally attach an invoice PDF and add an admin note
                for this upgrade.
              </p>

              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Admin note (optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Upgraded to PRO — invoice #INV-2026-001"
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                />
              </div>

              <label className="block mb-4">
                <span className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Invoice (optional, PDF only, max 5 MB)
                </span>
                <div
                  className={`relative flex items-center gap-2 border rounded-xl px-3 py-2.5 transition-colors cursor-pointer ${approveFile ? "border-green-500/40 bg-green-500/5" : "border-border bg-muted/30 hover:border-primary/40"}`}
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground truncate flex-1">
                    {approveFile ? approveFile.name : "Click to select a PDF…"}
                  </span>
                  {approveFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setApproveFile(null);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size > 5 * 1024 * 1024) {
                        setApproveError("File must be under 5 MB");
                        return;
                      }
                      setApproveFile(f ?? null);
                      setApproveError("");
                    }}
                  />
                </div>
              </label>

              {approveError && (
                <p className="text-xs text-red-400 mb-3">{approveError}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setApprovingId(null);
                    setApproveFile(null);
                    setApproveNote("");
                    setApproveError("");
                  }}
                  disabled={approveUploading}
                  className="flex-1 py-2 rounded-xl bg-muted/40 text-muted-foreground text-xs font-semibold hover:bg-muted/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approveUploading}
                  className="flex-1 py-2 bg-green-500/15 text-green-400 hover:bg-green-500/25 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                >
                  {approveUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {approveUploading ? "Processing…" : "Approve"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {attachingId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setAttachingId(null);
                setAttachFile(null);
                setAttachError("");
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Attach Invoice
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Upload a PDF invoice for this approved request. The user will be
                able to download it from their dashboard.
              </p>

              <label className="block mb-4">
                <span className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Invoice PDF (max 5 MB)
                </span>
                <div
                  className={`relative flex items-center gap-2 border rounded-xl px-3 py-2.5 transition-colors cursor-pointer ${attachFile ? "border-green-500/40 bg-green-500/5" : "border-border bg-muted/30 hover:border-primary/40"}`}
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground truncate flex-1">
                    {attachFile ? attachFile.name : "Click to select a PDF…"}
                  </span>
                  {attachFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAttachFile(null);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size > 5 * 1024 * 1024) {
                        setAttachError("File must be under 5 MB");
                        return;
                      }
                      setAttachFile(f ?? null);
                      setAttachError("");
                    }}
                  />
                </div>
              </label>

              {attachError && (
                <p className="text-xs text-red-400 mb-3">{attachError}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAttachingId(null);
                    setAttachFile(null);
                    setAttachError("");
                  }}
                  disabled={attachUploading}
                  className="flex-1 py-2 rounded-xl bg-muted/40 text-muted-foreground text-xs font-semibold hover:bg-muted/60 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAttachInvoice}
                  disabled={attachUploading || !attachFile}
                  className="flex-1 py-2 bg-primary/15 text-primary hover:bg-primary/25 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {attachUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  {attachUploading ? "Uploading…" : "Upload Invoice"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 mb-5">
        {(["PENDING", "ALL"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}
          >
            {t === "PENDING" ? "Pending" : "All Requests"}
          </button>
        ))}
      </div>
      {requestsQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-card rounded-xl p-10 text-center text-muted-foreground text-sm">
          {tab === "PENDING"
            ? "No pending upgrade requests."
            : "No requests yet."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map((req) => (
            <div key={req.id} className="glass-card rounded-xl p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold text-foreground text-sm">
                    {req.userEmail}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {req.userName}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {format(parseISO(req.createdAt), "PP pp")}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-bold ${PLAN_COLORS[req.planRequested]}`}
                >
                  → {req.planRequested}
                </span>
              </div>
              {req.note && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mb-3 italic">
                  "{req.note}"
                </p>
              )}
              {req.status === "PENDING" ? (
                <div className="flex gap-2">
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
                <div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${req.status === "APPROVED" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}
                  >
                    {req.status}
                  </span>
                  {req.status === "APPROVED" && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      {req.hasInvoice ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">
                                {req.invoiceFileName ?? "invoice.pdf"}
                              </span>
                            </div>
                            {req.invoiceUploadedAt && (
                              <p className="text-xs text-muted-foreground/60 mt-0.5 pl-5">
                                {format(parseISO(req.invoiceUploadedAt), "PP")}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={`/api/admin/upgrade-requests/${req.id}/invoice`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              title="Download invoice"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                            <button
                              onClick={() => {
                                setAttachingId(req.id);
                                setAttachFile(null);
                                setAttachError("");
                              }}
                              className="p-1 rounded-lg bg-muted/40 text-muted-foreground hover:bg-muted/60 transition-colors"
                              title="Replace invoice"
                            >
                              <Upload className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAttachingId(req.id);
                            setAttachFile(null);
                            setAttachError("");
                          }}
                          className="w-full py-1.5 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                        >
                          <Upload className="h-3.5 w-3.5" /> Attach Invoice
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
