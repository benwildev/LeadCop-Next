import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Loader2,
  Plus,
  Check,
  Trash2,
  FileText,
  Mail,
  Users,
  Send,
  X,
  RefreshCw,
  Download,
} from "lucide-react";
import { motion } from "framer-motion";
import TiptapEditor from "@/components/shared/TiptapEditor";
import { SectionHeader, GlassCard, ActionButton } from "@/components/shared";
import { axiosSecure } from "@/lib/api-client-react";

interface Subscriber {
  id: number;
  email: string;
  status: "ACTIVE" | "UNSUBSCRIBED";
  createdAt: string;
}

interface Campaign {
  id: number;
  subject: string;
  previewText: string | null;
  content: string;
  status: "DRAFT" | "SENDING" | "SENT";
  recipientCount: number;
  sentAt: string | null;
  createdAt: string;
}

const EMPTY_CAMPAIGN = {
  subject: "",
  previewText: "",
  content: "",
};

export function NewsletterAdminSection() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"subscribers" | "campaigns">("subscribers");

  const { data: subscribers = [], isLoading: loadingSubscribers } = useQuery<Subscriber[]>({
    queryKey: ["/api/admin/newsletter/subscribers"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/admin/newsletter/subscribers");
      return response.data;
    },
    enabled: activeTab === "subscribers",
  });

  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/admin/newsletter/campaigns"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/admin/newsletter/campaigns");
      return response.data;
    },
    enabled: activeTab === "campaigns",
  });

  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_CAMPAIGN);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof EMPTY_CAMPAIGN & { id?: number }) => {
      const url = payload.id ? `/api/admin/newsletter/campaigns/${payload.id}` : "/api/admin/newsletter/campaigns";
      const method = payload.id ? "patch" : "post";
      const response = await axiosSecure[method](url, payload);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/newsletter/campaigns"] });
      setEditing(null);
      setForm(EMPTY_CAMPAIGN);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || err.message || "Failed to save campaign");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosSecure.delete(`/api/admin/newsletter/campaigns/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/newsletter/campaigns"] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await axiosSecure.post(`/api/admin/newsletter/campaigns/${id}/send`);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/newsletter/campaigns"] });
    },
  });

  const deleteSubscriberMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosSecure.delete(`/api/admin/newsletter/subscribers/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/newsletter/subscribers"] });
    },
  });

  const openNewCampaign = () => {
    setEditing("new");
    setForm(EMPTY_CAMPAIGN);
    setError(null);
  };

  const openEditCampaign = (c: Campaign) => {
    setEditing(c.id);
    setForm({
      subject: c.subject,
      previewText: c.previewText || "",
      content: c.content,
    });
    setError(null);
  };

  const handleSave = () => {
    saveMutation.mutate(editing === "new" ? form : { ...form, id: editing as number });
  };

  const handleSend = (id: number, subject: string) => {
    if (confirm(`Are you sure you want to send "${subject}" to all active subscribers?`)) {
      sendMutation.mutate(id);
    }
  };

  return (
    <div className="max-w-6xl pb-12">
      <div className="flex items-center justify-between mb-8">
        <SectionHeader
          title="Newsletter Admin"
          subtitle="Manage your audience and send broadcast campaigns"
        />
        <div className="flex gap-2">
          {activeTab === "campaigns" && !editing && (
            <ActionButton icon={Plus} variant="primary" onClick={openNewCampaign}>
              New Campaign
            </ActionButton>
          )}
          {activeTab === "subscribers" && (
            <ActionButton 
              variant="outline" 
              icon={Download}
              onClick={() => window.open("/api/admin/newsletter/export", "_blank")}
            >
              Export CSV
            </ActionButton>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-8 border-b border-border">
        <button
          onClick={() => setActiveTab("subscribers")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === "subscribers" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Subscribers
          {activeTab === "subscribers" && (
            <motion.div
              layoutId="newsletter-tab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === "campaigns" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Campaigns
          {activeTab === "campaigns" && (
            <motion.div
              layoutId="newsletter-tab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            />
          )}
        </button>
      </div>

      {activeTab === "subscribers" ? (
        <GlassCard rounded="rounded-xl" padding="p-0" className="overflow-hidden">
          {loadingSubscribers ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No subscribers yet.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="border-b border-border">
                <tr>
                  {["Email", "Status", "Joined On", "Actions"].map((h) => (
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
                {subscribers.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {s.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.status === "ACTIVE" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}
                      >
                        {s.status === "ACTIVE" ? "Active" : "Unsubscribed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(parseISO(s.createdAt), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${s.email}?`)) {
                            deleteSubscriberMutation.mutate(s.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        {deleteSubscriberMutation.isPending && deleteSubscriberMutation.variables === s.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {editing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard rounded="rounded-2xl" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-lg font-bold">
                    {editing === "new" ? "New Campaign" : "Edit Campaign"}
                  </h3>
                  <button
                    onClick={() => setEditing(null)}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                      className="w-full bg-background/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">
                      Preview Text (Optional)
                    </label>
                    <input
                      type="text"
                      value={form.previewText}
                      onChange={(e) => setForm((f) => ({ ...f, previewText: e.target.value }))}
                      className="w-full bg-background/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">
                    Email Content
                  </label>
                  <div className="bg-background/50 border border-border rounded-2xl overflow-hidden min-h-[400px]">
                    <TiptapEditor
                      value={form.content}
                      onChange={(html) => setForm((f) => ({ ...f, content: html }))}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
                  <div className="flex gap-3 ml-auto">
                    <ActionButton variant="outline" onClick={() => setEditing(null)}>
                      Cancel
                    </ActionButton>
                    <ActionButton
                      variant="primary"
                      loading={saveMutation.isPending}
                      onClick={handleSave}
                    >
                      {editing === "new" ? "Create Campaign" : "Save Changes"}
                    </ActionButton>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          <GlassCard rounded="rounded-xl" padding="p-0" className="overflow-hidden">
            {loadingCampaigns ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No campaigns yet.
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="border-b border-border">
                  <tr>
                    {["Subject", "Status", "Recipients", "Sent At", "Actions"].map((h) => (
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
                  {campaigns.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground line-clamp-1">
                          {c.subject}
                        </div>
                        {c.previewText && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {c.previewText}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            c.status === "SENT"
                              ? "bg-green-500/15 text-green-400"
                              : c.status === "SENDING"
                                ? "bg-yellow-500/15 text-yellow-400"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {c.status === "SENT" ? "Sent" : c.status === "SENDING" ? "Sending…" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {c.recipientCount > 0 ? c.recipientCount : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {c.sentAt ? format(parseISO(c.sentAt), "MMM d, yyyy HH:mm") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {c.status !== "SENT" && (
                            <>
                              <button
                                onClick={() => openEditCampaign(c)}
                                title="Edit"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleSend(c.id, c.subject)}
                                disabled={sendMutation.isPending && sendMutation.variables === c.id}
                                title="Send"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-green-400 hover:bg-green-500/10 transition-colors"
                              >
                                {sendMutation.isPending && sendMutation.variables === c.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Delete this campaign?")) {
                                    deleteMutation.mutate(c.id);
                                  }
                                }}
                                disabled={deleteMutation.isPending && deleteMutation.variables === c.id}
                                title="Delete"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                {deleteMutation.isPending && deleteMutation.variables === c.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
