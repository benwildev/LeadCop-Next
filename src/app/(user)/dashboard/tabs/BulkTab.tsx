import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  FileSpreadsheet, Upload, Clipboard, Loader2, Download,
  CheckCircle2, AlertTriangle, Clock, ArrowUpRight, X, Play,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosSecure } from "@/lib/api-client-react";
import type { DashboardPlanConfig } from "@/lib/api-client-react";
import { GlassCard } from "@/components/shared";

interface BulkJob {
  id: number;
  status: string;
  totalEmails: number;
  processedCount: number;
  disposableCount: number;
  safeCount: number;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
  results?: BulkJobResult[];
}

interface BulkJobResult {
  email: string;
  domain: string;
  isDisposable: boolean;
  reputationScore: number;
  riskLevel: string;
  isFreeEmail: boolean;
  isRoleAccount: boolean;
  mxValid: boolean | null;
  tags: string[];
  error?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  pending: { bg: "bg-yellow-500/10", text: "text-yellow-400", icon: Clock },
  processing: { bg: "bg-blue-500/10", text: "text-blue-400", icon: Loader2 },
  done: { bg: "bg-green-500/10", text: "text-green-400", icon: CheckCircle2 },
  failed: { bg: "bg-red-500/10", text: "text-red-400", icon: AlertTriangle },
};

export default function BulkTab({ planConfig }: { planConfig: DashboardPlanConfig }) {
  const qc = useQueryClient();
  const [emails, setEmails] = useState("");
  const [error, setError] = useState("");
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [resultFilter, setResultFilter] = useState<"all" | "disposable" | "safe">("all");
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Plan gate
  const hasBulk = planConfig.hasBulkValidation;
  const bulkLimit = planConfig.bulkEmailLimit; // -1 = unlimited, 0 = disabled, N = max per job

  // Fetch jobs
  const { data: jobs = [], isLoading: loadingJobs } = useQuery<BulkJob[]>({
    queryKey: ["/api/bulk-jobs"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/bulk-jobs");
      return response.data;
    },
    enabled: hasBulk,
  });

  // Fetch active job details (polling)
  const { data: activeJob } = useQuery<BulkJob>({
    queryKey: ["/api/bulk-jobs", activeJobId],
    queryFn: async () => {
      const response = await axiosSecure.get(`/api/bulk-jobs/${activeJobId}`);
      return response.data;
    },
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const job = query.state.data as BulkJob | undefined;
      return job && (job.status === "processing" || job.status === "pending") ? 2000 : false;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (emailList: string[]) => {
      const response = await axiosSecure.post("/api/bulk-jobs", { emails: emailList });
      return response.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/bulk-jobs"] });
      setActiveJobId(data.id);
      setEmails("");
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || "Failed to submit job");
    }
  });

  const handleSubmit = async () => {
    setError("");
    const emailList = emails
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes("@"));

    if (emailList.length === 0) {
      setError("Please enter at least one valid email address.");
      return;
    }
    const maxEmails = bulkLimit === -1 ? Infinity : bulkLimit;
    if (emailList.length > maxEmails) {
      setError(`Your plan allows up to ${maxEmails} emails per job. (Found ${emailList.length})`);
      return;
    }

    submitMutation.mutate(emailList);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setEmails(content);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const viewJob = (id: number) => {
    setActiveJobId(id);
    setResultFilter("all");
  };

  const activeJobResults = activeJob?.results ?? [];

  const filteredResults = activeJobResults.filter(r => {
    if (resultFilter === "disposable") return r.isDisposable;
    if (resultFilter === "safe") return !r.isDisposable;
    return true;
  });

  const downloadCsv = () => {
    if (!activeJob) return;
    const headers = "Email,Domain,Disposable,Free,Role,MX,Reputation,Risk\n";
    const rows = activeJobResults.map(r => 
      `${r.email},${r.domain},${r.isDisposable},${r.isFreeEmail},${r.isRoleAccount},${r.mxValid},${r.reputationScore},${r.riskLevel}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leadcop-bulk-job-${activeJob.id}.csv`;
    a.click();
  };

  if (!hasBulk) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 rounded-3xl bg-amber-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Bulk Validation Not Available</h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-8">
          Your current plan doesn't include bulk email verification capabilities.
        </p>
        <Link href="/upgrade" className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2">
          View Upgrade Options <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Input section */}
      <div className="grid gap-6 md:grid-cols-2">
        <GlassCard className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base font-semibold text-foreground">New Batch</h3>
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
              Limit: {bulkLimit === -1 ? "Unlimited" : `${bulkLimit} emails`}
            </p>
          </div>
          
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative flex-1 group transition-all ${dragActive ? "scale-[0.98]" : ""}`}
          >
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Paste email list here (one per line or comma separated)..."
              className="w-full h-full min-h-[240px] bg-muted/40 border border-border rounded-2xl px-4 py-3 text-sm font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
            />
            {dragActive && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary/40 rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none">
                <Upload className="h-8 w-8 text-primary animate-bounce" />
                <span className="text-sm font-bold text-primary">Drop CSV or TXT here</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors flex items-center gap-2"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Import File
            </button>
            <input ref={fileRef} type="file" className="hidden" accept=".csv,.txt" onChange={handleFileUpload} />
            
            <button
              onClick={handleSubmit}
              disabled={submitMutation.isPending || !emails.trim()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Check
            </button>
          </div>
          {error && <p className="text-[10px] text-red-400 mt-2 font-medium">{error}</p>}
        </GlassCard>

        {/* Instructions/Features */}
        <div className="space-y-4">
          <GlassCard className="p-5 border-l-4 border-l-primary">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground mb-1">High Accuracy Processing</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Every batch undergoes full MX, DNS, and proprietary blocklist checks. No more guessing.
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5 border-l-4 border-l-emerald-500">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Download className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground mb-1">Actionable Results</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Download a cleaned list removing disposable providers to improve your deliverability immediately.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Active Job Result View */}
      <AnimatePresence>
        {activeJobId && activeJob && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl overflow-hidden border-primary/30"
          >
            <div className="p-6 bg-primary/5 border-b border-primary/10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-heading text-lg font-bold text-foreground">Results for Job #{activeJob.id}</h3>
                  {activeJob.status === "processing" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeJob.totalEmails} total · {activeJob.disposableCount} disposable ({Math.round(activeJob.disposableCount/activeJob.totalEmails*100)}%)
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex p-1 bg-muted/40 rounded-lg border border-border/50">
                  <button 
                    onClick={() => setResultFilter("all")}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${resultFilter === 'all' ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setResultFilter("disposable")}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${resultFilter === 'disposable' ? "bg-white text-red-500 shadow-sm" : "text-muted-foreground"}`}
                  >
                    Disposable
                  </button>
                  <button 
                    onClick={() => setResultFilter("safe")}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${resultFilter === 'safe' ? "bg-white text-emerald-500 shadow-sm" : "text-muted-foreground"}`}
                  >
                    Safe
                  </button>
                </div>
                <button 
                  onClick={downloadCsv}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-600 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
                <button 
                  onClick={() => setActiveJobId(null)}
                  className="p-2 text-muted-foreground hover:bg-muted rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
                  <tr className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {["Email", "Domain", "Disposable", "Free", "Role", "MX", "Reputation", "Risk"].map(h => (
                      <th key={h} className="py-3 px-4 first:pl-6 last:pr-6">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.slice(0, 100).map((r, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4 pl-6 font-mono text-xs text-foreground/80 max-w-[200px] truncate">{r.email}</td>
                      <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">{r.domain}</td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${r.isDisposable ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-500"}`}>
                          {r.isDisposable ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground">{r.isFreeEmail ? "Yes" : "—"}</td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground">{r.isRoleAccount ? "Yes" : "—"}</td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground">{r.mxValid === null ? "—" : r.mxValid ? "✓" : "✕"}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-xs font-bold ${r.reputationScore >= 70 ? "text-green-500" : r.reputationScore >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                          {r.reputationScore}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground capitalize">{r.riskLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredResults.length > 100 && (
                <p className="text-xs text-muted-foreground py-4 text-center">Showing first 100 of {filteredResults.length} results. Download CSV for full data.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job history */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
        <h3 className="font-heading text-base font-semibold text-foreground mb-4">Job History</h3>

        {loadingJobs ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No bulk jobs yet. Submit your first batch above.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map(job => {
              const st = STATUS_STYLES[job.status] ?? STATUS_STYLES.pending;
              const StatusIcon = st.icon;
              const progress = job.totalEmails > 0 ? Math.round((job.processedCount / job.totalEmails) * 100) : 0;
              return (
                <button
                  key={job.id}
                  onClick={() => viewJob(job.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:bg-muted/30 ${
                    activeJobId === job.id ? "border-primary/30 bg-primary/5" : "border-border/50"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-lg ${st.bg} flex items-center justify-center shrink-0`}>
                    <StatusIcon className={`h-4 w-4 ${st.text} ${job.status === "processing" ? "animate-spin" : ""}`} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">Job #{job.id}</span>
                      <span className={`text-[10px] font-bold uppercase ${st.text}`}>{job.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {job.totalEmails} emails · {job.disposableCount} disposable · {job.safeCount} safe
                    </p>
                    {(job.status === "processing" || job.status === "pending") && (
                      <div className="h-1 w-full rounded-full bg-border mt-2 overflow-hidden">
                        <div className="h-1 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {format(parseISO(job.createdAt), "MMM d, HH:mm")}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
