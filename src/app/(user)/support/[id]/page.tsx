"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Send, Loader2, Paperclip, X, FileText,
  Image as ImageIcon, User, Shield, ExternalLink, Download,
  CheckCircle2, Clock, PlayCircle, XCircle
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import Layout from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosSecure } from "@/lib/api-client-react";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface Message {
  id: string;
  message: string;
  isAdmin: boolean;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  category: string;
  updatedAt: string;
  createdAt: string;
  messages: Message[];
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; icon: any; cls: string }> = {
  open: { label: "Open", icon: Clock, cls: "bg-blue-500/10 text-blue-500" },
  in_progress: { label: "In Progress", icon: PlayCircle, cls: "bg-amber-500/10 text-amber-500" },
  resolved: { label: "Resolved", icon: CheckCircle2, cls: "bg-green-500/10 text-green-500" },
  closed: { label: "Closed", icon: XCircle, cls: "bg-slate-500/10 text-slate-500" },
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

function AttachmentPreview({ url, name }: { url: string; name?: string | null }) {
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name || url);
  return (
    <div className="mt-3 p-3 rounded-xl border border-border/50 bg-background/40 group relative overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {isImage ? <ImageIcon className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{name || "attachment"}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline flex items-center gap-1"
          >
            <Download className="w-3 h-3" /> Download
          </a>
        </div>
      </div>
      {isImage && (
        <div className="mt-2 rounded-lg overflow-hidden border border-border/30">
          <img src={url} alt={name || ""} className="max-w-full max-h-48 object-contain bg-muted" />
        </div>
      )}
    </div>
  );
}

export default function TicketDetailsPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [error, setError] = useState("");

  const { data: ticket, isLoading } = useQuery<Ticket>({
    queryKey: ["/api/support/tickets", ticketId],
    queryFn: async () => {
      const response = await axiosSecure.get(`/api/support/tickets/${ticketId}`);
      return response.data;
    },
    enabled: !!ticketId,
  });

  const replyMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await axiosSecure.post(`/api/support/tickets/${ticketId}/messages`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/support/tickets", ticketId] });
      setReply("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || "Failed to send message");
    }
  });

  useEffect(() => {
    if (ticket?.messages?.length) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [ticket?.messages?.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFileError("");
    if (!f) { setFile(null); return; }
    if (f.size > 10 * 1024 * 1024) { setFileError("Max 10 MB"); return; }
    setFile(f);
  };

  const handleReply = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!reply.trim() && !file) return;
    setError("");

    const fd = new FormData();
    fd.append("message", reply.trim());
    if (file) fd.append("attachment", file);

    replyMutation.mutate(fd);
  };

  if (isLoading || !ticket) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const isClosed = ticket.status === "closed" || ticket.status === "resolved";
  const sending = replyMutation.isPending;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-10">
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
          className="glass-card rounded-2xl overflow-hidden shadow-xl shadow-primary/5 flex flex-col min-h-[600px] max-h-[800px]"
        >
          <div className="px-6 py-5 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <StatusBadge status={ticket.status} />
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                  ID: {ticket.id}
                </span>
              </div>
              <h1 className="font-heading text-lg font-bold text-foreground line-clamp-1">{ticket.subject}</h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Last Activity</p>
              <p className="text-xs font-medium text-foreground">{format(parseISO(ticket.updatedAt), "MMM d, h:mm a")}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {ticket.messages.map((msg, i) => {
              const isAdmin = msg.isAdmin;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: isAdmin ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex gap-3 ${isAdmin ? "" : "flex-row-reverse"}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isAdmin ? "bg-primary/15" : "bg-muted/60"
                  }`}>
                    {isAdmin ? <Shield className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className={`flex-1 max-w-[85%] ${isAdmin ? "" : "text-right"}`}>
                    <div className={`inline-block px-4 py-3 rounded-2xl text-sm text-foreground text-left ${
                      isAdmin
                        ? "bg-muted/40 rounded-tl-sm border border-border/30"
                        : "bg-primary/15 rounded-tr-sm border border-primary/20"
                    }`}>
                      {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}
                      {msg.attachmentUrl && (
                        <AttachmentPreview url={msg.attachmentUrl} name={msg.attachmentName} />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 px-1">
                      {isAdmin ? "Support Agent" : "You"} · {format(parseISO(msg.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="px-6 py-5 border-t border-border bg-muted/10">
            {isClosed ? (
              <div className="text-center py-2 bg-muted/40 rounded-xl border border-border/50">
                <p className="text-sm text-muted-foreground">
                  This ticket is <strong>{ticket.status}</strong>. Please open a new ticket for further assistance.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReply} className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="Type your reply… (Ctrl+Enter to send)"
                      rows={3}
                      maxLength={5000}
                      onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleReply(); } }}
                      className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none shadow-sm"
                    />
                    
                    <div className="absolute right-3 bottom-3 flex items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.doc,.docx,.csv,.zip"
                        onChange={handleFileChange}
                        className="hidden"
                        id="reply-file"
                      />
                      
                      <AnimatePresence>
                        {file && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-lg border border-primary/20 text-[10px] font-bold text-primary"
                          >
                            <span className="truncate max-w-[100px]">{file.name}</span>
                            <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="hover:text-foreground">
                              <X className="w-3 h-3" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <label
                        htmlFor="reply-file"
                        className="p-2 rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground cursor-pointer transition-all border border-border/50"
                        title="Attach file"
                      >
                        <Paperclip className="w-4 h-4" />
                      </label>

                      <button
                        type="submit"
                        disabled={sending || (!reply.trim() && !file)}
                        className="p-2 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Send reply"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {fileError && <p className="text-xs text-red-400 font-medium px-1">{fileError}</p>}
                {error && <p className="text-xs text-red-400 font-medium px-1">{error}</p>}
                
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Max 10 MB · Supported: Images, PDF, DOC, ZIP
                  </p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${reply.length > 4500 ? "text-amber-500" : "text-muted-foreground"}`}>
                    {reply.length} / 5000
                  </p>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
