import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { SectionHeader, GlassCard, ActionButton } from "@/components/shared";
import { axiosSecure } from "@/lib/api-client-react";

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
          alt={name || "Attachment"}
          className="max-w-[240px] rounded-lg border border-border shadow-sm hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }

  return (
    <a
      href={makeProxyDownloadUrl(url, name || "file")}
      className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors group max-w-[240px]"
    >
      <FileText className="w-4 h-4 text-primary" />
      <span className="text-xs font-medium text-foreground truncate flex-1">
        {name || "Download file"}
      </span>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: ticketData, isLoading } = useQuery<{ ticket: AdminTicket; messages: SupportMessage[] }>({
    queryKey: ["/api/support/admin/tickets", ticketId],
    queryFn: async () => {
      const response = await axiosSecure.get(`/api/support/admin/tickets/${ticketId}`);
      return response.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      await axiosSecure.patch(`/api/support/admin/tickets/${ticketId}/status`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/support/admin/tickets"] });
      qc.invalidateQueries({ queryKey: ["/api/support/admin/tickets", ticketId] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (payload: { message: string; objectPath?: string; fileName?: string }) => {
      await axiosSecure.post(`/api/support/admin/tickets/${ticketId}/reply`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/support/admin/tickets", ticketId] });
      setReply("");
      setFile(null);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { uploadURL, objectPath } = (await axiosSecure.post("/api/support/upload-url")).data;
      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      return objectPath;
    },
  });

  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticketData?.messages]);

  const handleReply = async () => {
    if (!reply.trim() && !file) return;
    try {
      let objectPath;
      if (file) {
        objectPath = await uploadMutation.mutateAsync(file);
      }
      await replyMutation.mutateAsync({
        message: reply,
        objectPath,
        fileName: file?.name,
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading || !ticketData) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const { ticket, messages } = ticketData;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center gap-4 mb-5">
        <button
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="font-heading text-lg font-bold">{ticket.subject}</h3>
          <p className="text-xs text-muted-foreground">
            Ticket #{ticket.id} • {ticket.userName} ({ticket.userEmail})
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {["open", "in_progress", "resolved", "closed"].map((s) => (
            <button
              key={s}
              disabled={updateStatusMutation.isPending}
              onClick={() => updateStatusMutation.mutate(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                ticket.status === s
                  ? TICKET_STATUS_CONFIG[s].cls
                  : "bg-muted/40 text-muted-foreground hover:bg-muted"
              }`}
            >
              {TICKET_STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      <GlassCard
        rounded="rounded-2xl"
        padding="p-0"
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
        >
          {messages.map((m) => {
            const isAdmin = m.senderRole === "ADMIN";
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    isAdmin
                      ? "bg-primary text-white"
                      : "bg-muted/50 text-foreground border border-border/50"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {m.message}
                  </p>
                  {m.attachmentUrl && (
                    <AdminAttachmentPreview
                      url={m.attachmentUrl}
                      name={m.attachmentName}
                    />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1.5 px-1">
                  {isAdmin ? "You" : ticket.userName} •{" "}
                  {format(parseISO(m.createdAt), "MMM d, HH:mm")}
                </span>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-muted/30 border-t border-border/50 space-y-4">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply..."
            className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none min-h-[100px]"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg cursor-pointer transition-colors border border-border/50">
                <Paperclip className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {file ? file.name : "Attach"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
              {file && (
                <button
                  onClick={() => setFile(null)}
                  className="p-1 text-muted-foreground hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <ActionButton
              icon={Send}
              variant="primary"
              loading={replyMutation.isPending || uploadMutation.isPending}
              onClick={handleReply}
              disabled={!reply.trim() && !file}
            >
              Send Reply
            </ActionButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

export function SupportSection() {
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: ticketsData, isLoading } = useQuery<{ tickets: AdminTicket[] }>({
    queryKey: ["/api/support/admin/tickets"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/support/admin/tickets");
      return response.data;
    },
  });

  const tickets = (ticketsData?.tickets ?? []).filter((t) =>
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

      <GlassCard rounded="rounded-xl" padding="p-0" className="overflow-hidden">
        {isLoading ? (
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
      </GlassCard>
    </div>
  );
}
