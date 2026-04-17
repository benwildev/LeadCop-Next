import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Layers, Upload, RotateCcw, Loader2, CheckCircle, XCircle, Minus,
  Download, AlertTriangle, Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

interface BulkJobResultItem {
  email: string;
  domain?: string;
  isDisposable: boolean;
  reputationScore?: number;
  riskLevel?: string;
  isFreeEmail?: boolean;
  isRoleAccount?: boolean;
  mxValid?: boolean | null;
  inboxSupport?: boolean | null;
  tags?: string[];
  error?: string;
}

interface BulkJob {
  id: number;
  userId: number;
  status: "pending" | "processing" | "done" | "failed";
  totalEmails: number;
  processedCount: number;
  disposableCount: number;
  safeCount: number;
  results: BulkJobResultItem[];
  createdAt: string;
  completedAt: string | null;
}

export default function BulkVerifyTab({ plan, maxBulkEmails }: { plan: string; maxBulkEmails: number }) {
  const limit = maxBulkEmails;
  const [inputMode, setInputMode] = useState<"paste" | "csv">("paste");
  const [emailsText, setEmailsText] = useState("");
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [activeJob, setActiveJob] = useState<BulkJob | null>(null);
  const [filter, setFilter] = useState<"all" | "disposable" | "safe">("all");
  const [jobs, setJobs] = useState<BulkJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"email" | "domain" | "reputationScore" | "riskLevel">("email");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const fileRef = useRef<HTMLInputElement>(null);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const parseEmails = useCallback((text: string) => {
    const list = text
      .split(/[\n,;|\t]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@") && e.length > 4);
    setParsedEmails([...new Set(list)]);
  }, []);

  useEffect(() => { parseEmails(emailsText); }, [emailsText, parseEmails]);

  const loadJobs = useCallback(() => {
    fetch("/api/bulk-jobs", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setJobs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  useEffect(() => {
    if (activeJobId === null) return;
    const stopPoll = () => {
      if (pollInterval.current !== null) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    };
    const poll = () => {
      fetch(`/api/bulk-jobs/${activeJobId}`, { credentials: "include" })
        .then((r) => r.json())
        .then((job: BulkJob) => {
          setActiveJob(job);
          if (job.status === "done" || job.status === "failed") {
            stopPoll();
            loadJobs();
          }
        })
        .catch(() => {});
    };
    poll();
    pollInterval.current = setInterval(poll, 2000);
    return stopPoll;
  }, [activeJobId, loadJobs]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setEmailsText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (parsedEmails.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const r = await fetch("/api/bulk-jobs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: parsedEmails }),
      });
      const data = await r.json();
      if (!r.ok) { setSubmitError(data.error || "Failed to submit job"); return; }
      setActiveJobId(data.jobId);
      setActiveJob(null);
      setEmailsText("");
      setParsedEmails([]);
      setCsvFileName(null);
      setFilter("all");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDone = activeJob?.status === "done";
  const isFailed = activeJob?.status === "failed";
  const isRunning = activeJob?.status === "processing" || activeJob?.status === "pending";
  const progressPct = activeJob && activeJob.totalEmails > 0
    ? Math.round((activeJob.processedCount / activeJob.totalEmails) * 100)
    : 0;

  const results: BulkJobResultItem[] = activeJob?.results ?? [];
  const disposableCount = results.filter((r) => r.isDisposable).length;
  const safeCount = results.filter((r) => !r.isDisposable && !r.error).length;
  const errorCount = results.filter((r) => !!r.error).length;

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const filteredResults = (
    filter === "all" ? results
      : filter === "disposable" ? results.filter((r) => r.isDisposable)
      : results.filter((r) => !r.isDisposable && !r.error)
  ).slice().sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    if (sortField === "email") { av = a.email; bv = b.email; }
    else if (sortField === "domain") { av = a.domain ?? ""; bv = b.domain ?? ""; }
    else if (sortField === "reputationScore") { av = a.reputationScore ?? 0; bv = b.reputationScore ?? 0; }
    else if (sortField === "riskLevel") { av = a.riskLevel ?? ""; bv = b.riskLevel ?? ""; }
    if (typeof av === "number") return sortDir === "asc" ? av - (bv as number) : (bv as number) - av;
    return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
  });

  if (limit === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Layers className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Bulk Email Verification</h2>
            <p className="text-muted-foreground mt-1 text-sm max-w-md mx-auto">
              Verify hundreds of emails at once, download results as CSV, and track job history. Available on paid plans.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
            {[
              { plan: "BASIC", emails: "100 emails/job" },
              { plan: "PRO", emails: "500 emails/job" },
            ].map((p) => (
              <div key={p.plan} className="rounded-xl border border-border bg-background p-4 space-y-1">
                <span className="text-xs font-semibold text-primary uppercase">{p.plan}</span>
                <p className="text-sm font-medium">{p.emails}</p>
              </div>
            ))}
          </div>
          <Link href="/dashboard?tab=billing">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-sm">
              <Zap className="h-4 w-4" />
              Upgrade to unlock
            </button>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Bulk Email Verification</h2>
          <p className="text-sm text-muted-foreground">Verify up to {limit.toLocaleString()} emails per job</p>
        </div>
        {activeJobId !== null && (
          <button
            onClick={() => { setActiveJobId(null); setActiveJob(null); setFilter("all"); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            New job
          </button>
        )}
      </div>

      {activeJobId === null && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex gap-1 p-1 bg-muted/40 rounded-lg w-fit">
            {(["paste", "csv"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setInputMode(m); setEmailsText(""); setParsedEmails([]); setCsvFileName(null); }}
                className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${inputMode === m ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {m === "paste" ? "Paste emails" : "Upload CSV"}
              </button>
            ))}
          </div>

          {inputMode === "paste" ? (
            <textarea
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              placeholder={"Paste emails separated by commas, semicolons, or new lines...\n\nexample@gmail.com\ntest@yahoo.com"}
              className="w-full h-44 px-4 py-3 rounded-xl border border-border bg-background text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60"
            />
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                setCsvFileName(file.name);
                const reader = new FileReader();
                reader.onload = (ev) => setEmailsText(ev.target?.result as string);
                reader.readAsText(file);
              }}
              className="w-full h-44 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-background flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
              <Upload className="h-8 w-8 text-muted-foreground" />
              {csvFileName ? (
                <p className="text-sm font-medium">{csvFileName}</p>
              ) : (
                <>
                  <p className="text-sm font-medium">Drop CSV here or click to browse</p>
                  <p className="text-xs text-muted-foreground">One email per row or comma-separated</p>
                </>
              )}
            </div>
          )}

          {parsedEmails.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{parsedEmails.length}</span> unique email{parsedEmails.length !== 1 ? "s" : ""} detected
              </span>
              {parsedEmails.length > limit && (
                <span className="text-destructive font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Exceeds plan limit of {limit}
                </span>
              )}
            </div>
          )}

          {submitError && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <XCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || parsedEmails.length === 0 || parsedEmails.length > limit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
            {isSubmitting ? "Submitting…" : `Verify ${parsedEmails.length > 0 ? parsedEmails.length : ""} Email${parsedEmails.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {activeJob !== null && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRunning && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              {isDone && <CheckCircle className="h-4 w-4 text-green-500" />}
              {isFailed && <XCircle className="h-4 w-4 text-destructive" />}
              <span className="font-medium capitalize">{activeJob.status}</span>
              <span className="text-sm text-muted-foreground">· {activeJob.totalEmails} emails</span>
            </div>
            {isDone && (
              <a
                href={`/api/bulk-jobs/${activeJob.id}/download`}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </a>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${isDone ? 100 : progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{activeJob.processedCount} processed</span>
              <span>{isDone ? "100%" : `${progressPct}%`}</span>
            </div>
          </div>

          {isDone && results.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Checked", value: results.length, icon: Layers, color: "text-foreground", pct: null },
                { label: "Disposable Rate", value: disposableCount, icon: XCircle, color: "text-destructive", pct: results.length > 0 ? Math.round((disposableCount / results.length) * 100) : 0 },
                { label: "Safe", value: safeCount, icon: CheckCircle, color: "text-green-500", pct: results.length > 0 ? Math.round((safeCount / results.length) * 100) : 0 },
                { label: "Errors", value: errorCount, icon: Minus, color: "text-muted-foreground", pct: results.length > 0 ? Math.round((errorCount / results.length) * 100) : 0 },
              ].map(({ label, value, icon: Icon, color, pct }) => (
                <div key={label} className="rounded-xl border border-border bg-background p-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  {pct !== null && <p className="text-xs text-muted-foreground">{pct}% of total</p>}
                </div>
              ))}
            </div>
          )}

          {isDone && results.length > 0 && (
            <div className="space-y-3">
              <div className="flex gap-1 p-1 bg-muted/40 rounded-lg w-fit">
                {(["all", "disposable", "safe"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 text-xs rounded-md font-medium capitalize transition-colors ${filter === f ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {f} {f === "all" ? `(${results.length})` : f === "disposable" ? `(${disposableCount})` : `(${safeCount})`}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {([
                        { key: "email", label: "Email" },
                        { key: "domain", label: "Domain" },
                        { key: "reputationScore", label: "Score" },
                        { key: "riskLevel", label: "Risk" },
                        { key: null, label: "Disposable" },
                        { key: null, label: "Tags" },
                        { key: null, label: "Result" },
                      ] as { key: typeof sortField | null; label: string }[]).map(({ key, label }) => (
                        <th
                          key={label}
                          onClick={() => key && handleSort(key)}
                          className={`px-4 py-2.5 font-medium text-muted-foreground text-left text-xs select-none ${key ? "cursor-pointer hover:text-foreground transition-colors" : ""}`}
                        >
                          {label}
                          {key && sortField === key && (
                            <span className="ml-1 opacity-60">{sortDir === "asc" ? "↑" : "↓"}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs truncate max-w-[160px]">{row.email}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{row.domain ?? "—"}</td>
                        <td className="px-4 py-2.5 text-xs">
                          {row.reputationScore !== undefined ? (
                            <span className={`font-semibold ${row.reputationScore >= 80 ? "text-green-500" : row.reputationScore >= 50 ? "text-yellow-500" : "text-destructive"}`}>
                              {row.reputationScore}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-xs capitalize text-muted-foreground">{row.riskLevel ?? "—"}</td>
                        <td className="px-4 py-2.5 text-center text-xs">
                          {row.isDisposable
                            ? <XCircle className="h-3.5 w-3.5 text-destructive mx-auto" />
                            : <CheckCircle className="h-3.5 w-3.5 text-green-500 mx-auto" />}
                        </td>
                        <td className="px-4 py-2.5 text-xs max-w-[140px]">
                          <div className="flex flex-wrap gap-1">
                            {row.tags?.length
                              ? row.tags.map((t) => (
                                  <span key={t} className="inline-block px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px]">{t}</span>
                                ))
                              : <span className="text-muted-foreground">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {row.error ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">Error</span>
                          ) : row.isDisposable ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">Disposable</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium">Safe</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <h3 className="font-semibold text-sm">Job History</h3>
        {jobsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs yet. Submit your first bulk verification above.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Job ID</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Emails</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Created</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Download</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => { setActiveJobId(job.id); setActiveJob(job); setFilter("all"); }}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">#{job.id}</td>
                    <td className="px-4 py-2.5">{job.totalEmails}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        job.status === "done"
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : job.status === "failed"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary"
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5">
                      {job.status === "done" && (
                        <a
                          href={`/api/bulk-jobs/${job.id}/download`}
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-primary hover:underline text-xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          CSV
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
