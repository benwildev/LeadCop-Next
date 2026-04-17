import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Loader2,
  Send,
  ArrowLeft,
  Paperclip,
  FileText,
  ExternalLink,
  X,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { SectionHeader } from "@/components/shared";

type AdminTicket = {
  id: number;
  subject: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userId: number;
  userName: string | null;
  userEmail: string | null;
};

type SupportMessage = {
  id: number;
  ticketId: number;
  senderRole: string;
  message: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
};

const TICKET_STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; cls: string }
> = {
  open: {
    label: "Open",
    icon: AlertCircle,
    cls: "bg-blue-500/15 text-blue-400",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    cls: "bg-yellow-500/15 text-yellow-400",
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle,
    cls: "bg-green-500/15 text-green-400",
  },
  closed: {
    label: "Closed",
    icon: XCircle,
    cls: "bg-muted/60 text-muted-foreground",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  billing: "Billing",
  technical: "Technical",
  feature: "Feature Request",
};

const MAX_ATTACH_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACH = /\.(jpg|jpeg|png|gif|webp|pdf|txt|doc|docx|csv|zip)$/i;

function isAttachImage(url: string) {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
}

function makeProxyDownloadUrl(url: string, filename: string): string {
  return `/api/support/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(filename)}`;
}

function AdminAttachmentPreview({
  url,
  name,
}: {
  url: string;
  name?: string | null;
}) {
  if (isAttachImage(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-2"
      >
        <img
          src={url}
          alt={name ?? "attachment"}
          className="max-w-[200px] max-h-[140px] rounded-xl object-cover border border-border hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }
  const downloadUrl = makeProxyDownloadUrl(url, name ?? "attachment");
  return (
    <a
      href={downloadUrl}
      className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl bg-muted/60 border border-border text-xs text-foreground hover:bg-muted transition-colors"
    >
      <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
      <span className="truncate max-w-[140px]">{name ?? "attachment"}</span>
      <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
    </a>
  );
}

function AdminTicketDetail({
  ticketId,
  onBack,
}: {
  ticketId: number;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [notifyUser, setNotifyUser] = useState(true);

  const detailQuery = useQuery<{
    ticket: AdminTicket;
    messages: SupportMessage[];
  }>({
    queryKey: [`/api/support/admin/tickets/${ticketId}`],
    queryFn: () =>
      fetch(`/api/support/admin/tickets/${ticketId}`, {
        credentials: "include",
      }).then((r) => r.json()),
  });

  const ticket = detailQuery.data?.ticket;
  const messages = detailQuery.data?.messages ?? [];

  useEffect(() => {
    if (ticket) setNewStatus(ticket.status);
  }, [ticket]);

  useEffect(() => {
    setNotifyUser(true);
  }, [ticketId]);

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === ticket?.status) return;
    setUpdatingStatus(true);
    try {
      await fetch(`/api/support/admin/tickets/${ticketId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus, notify: notifyUser }),
      });
      setNotifyUser(true);
      qc.invalidateQueries({
        queryKey: [`/api/support/admin/tickets/${ticketId}`],
      });
      qc.invalidateQueries({ queryKey: ["/api/support/admin/tickets"] });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFileError("");
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_ATTACH_SIZE) {
      setFileError("File must be under 10 MB");
      return;
    }
    if (!ALLOWED_ATTACH.test(f.name)) {
      setFileError("File type not allowed");
      return;
    }
    setFile(f);
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() && !file) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("message", reply.trim());
      if (file) fd.append("attachment", file);
      await fetch(`/api/support/admin/tickets/${ticketId}/reply`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      setReply("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      qc.invalidateQueries({
        queryKey: [`/api/support/admin/tickets/${ticketId}`],
      });
      qc.invalidateQueries({ queryKey: ["/api/support/admin/tickets"] });
    } finally {
      setSending(false);
    }
  };

  if (detailQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) return null;

  const statusCfg =
    TICKET_STATUS_CONFIG[ticket.status] ?? TICKET_STATUS_CONFIG.open;
  const StatusIcon = statusCfg.icon;

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Tickets
      </button>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">
              {ticket.subject}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {CATEGORY_LABELS[ticket.category] ?? ticket.category} ·{" "}
              {ticket.userName ?? "Unknown"} ({ticket.userEmail}) · Opened{" "}
              {format(parseISO(ticket.createdAt), "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifyUser}
                onChange={(e) => setNotifyUser(e.target.checked)}
                className="w-3.5 h-3.5 accent-primary"
              />
              Notify user
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="text-xs rounded-lg px-2 py-1.5 bg-muted/40 border border-border text-foreground focus:outline-none"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <button
              onClick={handleStatusUpdate}
              disabled={updatingStatus || newStatus === ticket.status}
              className="px-3 py-1.5 bg-primary/15 text-primary hover:bg-primary/25 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
            >
              {updatingStatus ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "Update"
              )}
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4 min-h-[250px] max-h-[400px] overflow-y-auto">
          {messages.map((msg) => {
            const isAdmin = msg.senderRole === "admin";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isAdmin ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    isAdmin
                      ? "bg-primary/15 text-primary"
                      : "bg-muted/60 text-muted-foreground"
                  }`}
                >
                  {isAdmin ? "A" : "U"}
                </div>
                <div
                  className={`flex-1 max-w-[85%] ${isAdmin ? "text-right" : ""}`}
                >
                  <div
                    className={`inline-block px-4 py-3 rounded-2xl text-sm text-foreground ${
                      isAdmin
                        ? "bg-primary/15 rounded-tr-sm"
                        : "bg-muted/40 rounded-tl-sm"
                    }`}
                  >
                    {msg.message && (
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    )}
                    {msg.attachmentUrl && (
                      <AdminAttachmentPreview
                        url={msg.attachmentUrl}
                        name={msg.attachmentName}
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isAdmin ? "Admin" : "Customer"} ·{" "}
                    {format(parseISO(msg.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-border">
          <form onSubmit={handleReply} className="space-y-2.5">
            <div className="flex gap-3">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply…"
                rows={3}
                maxLength={5000}
                className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
              />
              <button
                type="submit"
                disabled={sending || (!reply.trim() && !file)}
                className="self-end px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Reply
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.doc,.docx,.csv,.zip"
                onChange={handleFileChange}
                className="hidden"
                id="admin-reply-file"
              />
              <label
                htmlFor="admin-reply-file"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Attach file
              </label>
              {file && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-lg border border-border text-xs text-foreground">
                  <FileText className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="truncate max-w-[140px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-muted-foreground hover:text-foreground ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {fileError && (
                <span className="text-xs text-red-400">{fileError}</span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                Max 10 MB · Images, PDF, DOC, ZIP
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function SupportSection() {
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const ticketsQuery = useQuery<{ tickets: AdminTicket[] }>({
    queryKey: ["/api/support/admin/tickets"],
    queryFn: () =>
      fetch("/api/support/admin/tickets", { credentials: "include" }).then(
        (r) => r.json(),
      ),
  });

  const tickets = (ticketsQuery.data?.tickets ?? []).filter((t) =>
    statusFilter === "all" ? true : t.status === statusFilter,
  );

  if (selectedTicketId !== null) {
    return (
      <AdminTicketDetail
        ticketId={selectedTicketId}
        onBack={() => setSelectedTicketId(null)}
      />
    );
  }

  return (
    <div>
      <SectionHeader
        title="Support"
        subtitle="Manage customer support tickets"
      />

      <div className="flex gap-2 mb-5 flex-wrap">
        {["all", "open", "in_progress", "resolved", "closed"].map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === f
                ? "bg-primary/15 text-primary"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "All" : (TICKET_STATUS_CONFIG[f]?.label ?? f)}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        {ticketsQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No tickets found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-border">
                <tr>
                  {[
                    "Subject",
                    "Customer",
                    "Category",
                    "Status",
                    "Updated",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const cfg =
                    TICKET_STATUS_CONFIG[t.status] ?? TICKET_STATUS_CONFIG.open;
                  const Icon = cfg.icon;
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">
                        {t.subject}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-foreground">
                          {t.userName ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t.userEmail}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                        {CATEGORY_LABELS[t.category] ?? t.category}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}
                        >
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(parseISO(t.updatedAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedTicketId(t.id)}
                          className="px-3 py-1 text-xs font-medium bg-muted/40 hover:bg-muted/70 text-foreground rounded-lg transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
