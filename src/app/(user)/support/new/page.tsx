"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosSecure } from "@/lib/api-client-react";

const CATEGORIES = [
  { value: "general", label: "General Inquiry" },
  { value: "billing", label: "Billing & Payments" },
  { value: "technical", label: "Technical Issue" },
  { value: "feature", label: "Feature Request" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = /\.(jpg|jpeg|png|gif|webp|pdf|txt|doc|docx|csv|zip)$/i;

function isImageFile(name: string) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
}

export default function SupportNewPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await axiosSecure.post("/api/support/tickets", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      router.push(`/support/${data.ticketId}`);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || "Failed to submit ticket. Please try again.");
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFileError("");
    if (!f) { setFile(null); return; }
    if (f.size > MAX_FILE_SIZE) { setFileError("File must be under 10 MB"); return; }
    if (!ALLOWED_TYPES.test(f.name)) { setFileError("File type not allowed"); return; }
    setFile(f);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setError("");

    const fd = new FormData();
    fd.append("subject", subject.trim());
    fd.append("category", category);
    fd.append("message", message.trim());
    if (file) fd.append("attachment", file);

    createMutation.mutate(fd);
  };

  const submitting = createMutation.isPending;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-10">
        <Link
          href="/support"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tickets
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-8 shadow-xl shadow-primary/5"
        >
          <h1 className="font-heading text-2xl font-bold text-foreground mb-1">New Support Ticket</h1>
          <p className="text-muted-foreground text-sm mb-8">Please describe your issue and we'll get back to you within 24 hours.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                required
                maxLength={200}
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Please provide as much detail as possible…"
                required
                rows={6}
                maxLength={5000}
                className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{message.length}/5000</p>
            </div>

            {/* File attachment */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Attachment (optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.doc,.docx,.csv,.zip"
                onChange={handleFileChange}
                className="hidden"
                id="ticket-file"
              />
              {file ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 border border-border rounded-xl">
                  {isImageFile(file.name) ? <ImageIcon className="w-4 h-4 text-primary flex-shrink-0" /> : <FileText className="w-4 h-4 text-primary flex-shrink-0" />}
                  <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                  <button
                    type="button"
                    onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="ticket-file"
                  className="flex items-center justify-center gap-2 w-full px-3 py-3 bg-muted/40 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 cursor-pointer transition-all"
                >
                  <Paperclip className="w-4 h-4" />
                  Click to attach a file
                </label>
              )}
              {fileError && <p className="text-xs text-red-400 mt-1">{fileError}</p>}
              <p className="text-xs text-muted-foreground mt-1">Max 10 MB · Supported: Images, PDF, DOC, TXT, CSV, ZIP</p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !subject.trim() || !message.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              ) : (
                <><Send className="w-4 h-4" /> Submit Ticket</>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
}
