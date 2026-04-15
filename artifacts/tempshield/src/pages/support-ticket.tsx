import React, { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import { Navbar } from "@/components/Layout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Loader2, AlertCircle, Clock, CheckCircle, XCircle, Shield, User, Paperclip, X, FileText, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface Message {
  id: number;
  ticketId: number;
  senderRole: "user" | "admin";
  message: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
}

interface Ticket {
  id: number;
  subject: string;
  category: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; icon: React.ElementType; cls: string }> = {
  open: { label: "Open", icon: AlertCircle, cls: "bg-blue-500/15 text-blue-400" },
  in_progress: { label: "In Progress", icon: Clock, cls: "bg-yellow-500/15 text-yellow-400" },
  resolved: { label: "Resolved", icon: CheckCircle, cls: "bg-green-500/15 text-green-400" },
  closed: { label: "Closed", icon: XCircle, cls: "bg-muted/60 text-muted-foreground" },
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  billing: "Billing",
  technical: "Technical",
  feature: "Feature Request",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = /\.(jpg|jpeg|png|gif|webp|pdf|txt|doc|docx|csv|zip)$/i;

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
}

function makeProxyDownloadUrl(url: string, filename: string): string {
  return `/api/support/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(filename)}`;
}

function AttachmentPreview({ url, name }: { url: string; name?: string | null }) {
  if (isImageUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
        <img src={url} alt={name ?? "attachment"} className="max-w-[240px] max-h-[160px] rounded-xl object-cover border border-border hover:opacity-90 transition-opacity" />
      </a>
    );
  }
  const downloadUrl = makeProxyDownloadUrl(url, name ?? "attachment");
  return (
    <a
      href={downloadUrl}
      className="inline-flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-muted/60 border border-border text-xs text-foreground hover:bg-muted transition-colors"
    >
      <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
      <span className="truncate max-w-[160px]">{name ?? "attachment"}</span>
      <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
    </a>
  );
}

export default function SupportTicketPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ticketQuery = useQuery<{ ticket: Ticket; messages: Message[] }>({
    queryKey: [`/api/support/tickets/${ticketId}`],
    queryFn: () => fetch(`/api/support/tickets/${ticketId}`, { credentials: "include" }).then(r => {
      if (!r.ok) throw new Error("Ticket not found");
      return r.json();
    }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticketQuery.data?.messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFileError("");
    if (!f) { setFile(null); return; }
    if (f.size > MAX_FILE_SIZE) { setFileError("File must be under 10 MB"); return; }
    if (!ALLOWED_TYPES.test(f.name)) { setFileError("File type not allowed"); return; }
    setFile(f);
  };

  const handleReply = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!reply.trim() && !file) return;
    setSending(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("message", reply.trim());
      if (file) fd.append("attachment", file);

      const resp = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to send reply");
      }

      setReply("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      qc.invalidateQueries({ queryKey: [`/api/support/tickets/${ticketId}`] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSending(false);
    }
  };

  const ticket = ticketQuery.data?.ticket;
  const messages = ticketQuery.data?.messages ?? [];
  const isClosed = ticket?.status === "closed" || ticket?.status === "resolved";

  if (ticketQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center pt-28 pb-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (ticketQuery.isError || !ticket) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-28 pb-16 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-foreground font-medium">Ticket not found</p>
          <Link href="/support"><button className="mt-4 text-sm text-primary hover:underline">Back to support</button></Link>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-28 pb-8">
        <Link href="/support">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Support
          </button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-heading text-xl font-bold text-foreground">{ticket.subject}</h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {CATEGORY_LABELS[ticket.category] ?? ticket.category} · Opened {format(parseISO(ticket.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${statusCfg.cls}`}>
                <StatusIcon className="w-3 h-3" />
                {statusCfg.label}
              </span>
            </div>
          </div>

          <div className="px-6 py-4 space-y-4 min-h-[300px] max-h-[500px] overflow-y-auto">
            {messages.map((msg, i) => {
              const isAdmin = msg.senderRole === "admin";
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex gap-3 ${isAdmin ? "" : "flex-row-reverse"}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isAdmin ? "bg-primary/15" : "bg-muted/60"
                  }`}>
                    {isAdmin ? <Shield className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className={`flex-1 max-w-[85%] ${isAdmin ? "" : "text-right"}`}>
                    <div className={`inline-block px-4 py-3 rounded-2xl text-sm text-foreground ${
                      isAdmin
                        ? "bg-muted/40 rounded-tl-sm"
                        : "bg-primary/15 rounded-tr-sm"
                    }`}>
                      {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}
                      {msg.attachmentUrl && (
                        <AttachmentPreview url={msg.attachmentUrl} name={msg.attachmentName} />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isAdmin ? "Support" : "You"} · {format(parseISO(msg.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="px-6 py-4 border-t border-border">
            {isClosed ? (
              <p className="text-center text-sm text-muted-foreground py-2">
                This ticket is {ticket.status}. Open a new ticket if you need further assistance.
              </p>
            ) : (
              <form onSubmit={handleReply} className="space-y-3">
                <div className="flex gap-3">
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Type your reply… (Ctrl+Enter to send)"
                    rows={3}
                    maxLength={5000}
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleReply(); } }}
                    className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || (!reply.trim() && !file)}
                    className="self-end px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send
                  </button>
                </div>

                {/* File attachment row */}
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.doc,.docx,.csv,.zip"
                    onChange={handleFileChange}
                    className="hidden"
                    id="reply-file"
                  />
                  <label
                    htmlFor="reply-file"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    Attach file
                  </label>

                  {file && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-lg border border-border text-xs text-foreground">
                      {isImageUrl(file.name) ? <ImageIcon className="w-3.5 h-3.5 text-primary" /> : <FileText className="w-3.5 h-3.5 text-primary" />}
                      <span className="truncate max-w-[140px]">{file.name}</span>
                      <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-muted-foreground hover:text-foreground ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {fileError && <span className="text-xs text-red-400">{fileError}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">Max 10 MB · Images, PDF, DOC, ZIP</span>
                </div>
              </form>
            )}
            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
