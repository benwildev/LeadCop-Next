import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Loader2,
  Plus,
  Check,
  Trash2,
  Send,
  FileText,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

interface NLSubscriber {
  id: number;
  email: string;
  name: string | null;
  status: "ACTIVE" | "UNSUBSCRIBED";
  subscribedAt: string;
  unsubscribedAt: string | null;
}

interface NLCampaign {
  id: number;
  subject: string;
  previewText: string | null;
  htmlContent: string;
  status: "DRAFT" | "SENDING" | "SENT";
  recipientCount: number;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const EMPTY_CAMPAIGN = { subject: "", previewText: "", htmlContent: "" };

export function NewsletterAdminSection() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"subscribers" | "campaigns">("subscribers");

  const subsQuery = useQuery<{
    subscribers: NLSubscriber[];
    total: number;
    activeCount: number;
  }>({
    queryKey: ["/api/admin/newsletter/subscribers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/newsletter/subscribers", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const [deletingSub, setDeletingSub] = useState<number | null>(null);
  const handleDeleteSub = async (id: number, email: string) => {
    if (!confirm(`Remove ${email} from subscribers?`)) return;
    setDeletingSub(id);
    try {
      await fetch(`/api/admin/newsletter/subscribers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      qc.invalidateQueries({ queryKey: ["/api/admin/newsletter/subscribers"] });
    } finally {
      setDeletingSub(null);
    }
  };

  const campaignsQuery = useQuery<{ campaigns: NLCampaign[] }>({
    queryKey: ["/api/admin/newsletter/campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/admin/newsletter/campaigns", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const [editingCampaign, setEditingCampaign] = useState<NLCampaign | null>(
    null,
  );
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<number | null>(null);

  const campaigns = campaignsQuery.data?.campaigns ?? [];
  const subscribers = subsQuery.data?.subscribers ?? [];

  const openCreateCampaign = () => {
    setCampaignForm(EMPTY_CAMPAIGN);
    setEditingCampaign(null);
    setCreatingCampaign(true);
  };
  const openEditCampaign = (c: NLCampaign) => {
    setCampaignForm({
      subject: c.subject,
      previewText: c.previewText ?? "",
      htmlContent: c.htmlContent,
    });
    setEditingCampaign(c);
    setCreatingCampaign(false);
  };
  const closeCampaignForm = () => {
    setCreatingCampaign(false);
    setEditingCampaign(null);
  };

  const handleSaveCampaign = async () => {
    setSavingCampaign(true);
    try {
      const body = {
        ...campaignForm,
        previewText: campaignForm.previewText || null,
      };
      const url = editingCampaign
        ? `/api/admin/newsletter/campaigns/${editingCampaign.id}`
        : "/api/admin/newsletter/campaigns";
      const method = editingCampaign ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Failed to save");
        return;
      }
      qc.invalidateQueries({ queryKey: ["/api/admin/newsletter/campaigns"] });
      closeCampaignForm();
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleSend = async (id: number, subject: string) => {
    if (
      !confirm(
        `Send "${subject}" to all active subscribers? This cannot be undone.`,
      )
    )
      return;
    setSendingId(id);
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${id}/send`, {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error || "Failed to send");
        return;
      }
      alert(d.message);
      qc.invalidateQueries({ queryKey: ["/api/admin/newsletter/campaigns"] });
    } finally {
      setSendingId(null);
    }
  };

  const handleDeleteCampaign = async (id: number) => {
    if (!confirm("Delete this campaign?")) return;
    setDeletingCampaign(id);
    try {
      await fetch(`/api/admin/newsletter/campaigns/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      qc.invalidateQueries({ queryKey: ["/api/admin/newsletter/campaigns"] });
    } finally {
      setDeletingCampaign(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Newsletter
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage subscribers and send campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold px-3 py-1.5">
            <Users className="w-3 h-3" /> {subsQuery.data?.activeCount ?? 0}{" "}
            active
          </span>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-muted/30 rounded-xl p-1 w-fit">
        {(["subscribers", "campaigns"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "subscribers" ? (
        <div className="glass-card rounded-xl overflow-hidden">
          {subsQuery.isLoading ? (
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
                  {["Email", "Name", "Status", "Subscribed", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => (
                  <tr
                    key={sub.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {sub.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {sub.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sub.status === "ACTIVE" ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}
                      >
                        {sub.status === "ACTIVE" ? "Active" : "Unsubscribed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(parseISO(sub.subscribedAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteSub(sub.id, sub.email)}
                        disabled={deletingSub === sub.id}
                        title="Remove subscriber"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        {deletingSub === sub.id ? (
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
        </div>
      ) : (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={openCreateCampaign}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Campaign
            </button>
          </div>

          {(creatingCampaign || !!editingCampaign) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-6 mb-6 border border-primary/20"
            >
              <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
                {editingCampaign ? "Edit Campaign" : "New Campaign"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Subject
                  </label>
                  <input
                    value={campaignForm.subject}
                    onChange={(e) =>
                      setCampaignForm((f) => ({
                        ...f,
                        subject: e.target.value,
                      }))
                    }
                    placeholder="Email subject line"
                    className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Preview Text
                  </label>
                  <input
                    value={campaignForm.previewText}
                    onChange={(e) =>
                      setCampaignForm((f) => ({
                        ...f,
                        previewText: e.target.value,
                      }))
                    }
                    placeholder="Short preview shown in inboxes (optional)"
                    className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    HTML Content
                  </label>
                  <textarea
                    value={campaignForm.htmlContent}
                    onChange={(e) =>
                      setCampaignForm((f) => ({
                        ...f,
                        htmlContent: e.target.value,
                      }))
                    }
                    placeholder="<p>Your email content in HTML…</p>"
                    rows={10}
                    className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono resize-y"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleSaveCampaign}
                  disabled={
                    savingCampaign ||
                    !campaignForm.subject ||
                    !campaignForm.htmlContent
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {savingCampaign ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {editingCampaign ? "Save Changes" : "Create Campaign"}
                </button>
                <button
                  onClick={closeCampaignForm}
                  className="px-5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          <div className="glass-card rounded-xl overflow-hidden">
            {campaignsQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No campaigns yet. Create your first one!
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="border-b border-border">
                  <tr>
                    {[
                      "Subject",
                      "Status",
                      "Recipients",
                      "Sent At",
                      "Actions",
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
                          {c.status === "SENT"
                            ? "Sent"
                            : c.status === "SENDING"
                              ? "Sending…"
                              : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {c.recipientCount > 0 ? c.recipientCount : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {c.sentAt
                          ? format(parseISO(c.sentAt), "MMM d, yyyy HH:mm")
                          : "—"}
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
                                disabled={sendingId === c.id}
                                title="Send"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-green-400 hover:bg-green-500/10 transition-colors"
                              >
                                {sendingId === c.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteCampaign(c.id)}
                                disabled={deletingCampaign === c.id}
                                title="Delete"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                {deletingCampaign === c.id ? (
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
          </div>
        </div>
      )}
    </div>
  );
}
