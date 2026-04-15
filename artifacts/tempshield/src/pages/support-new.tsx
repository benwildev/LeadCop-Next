import React, { useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Layout";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

const CATEGORIES = [
  { value: "general", label: "General Inquiry" },
  { value: "billing", label: "Billing & Payments" },
  { value: "technical", label: "Technical Issue" },
  { value: "feature", label: "Feature Request" },
];

export default function SupportNewPage() {
  const [, navigate] = useLocation();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const resp = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject: subject.trim(), category, message: message.trim() }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to submit ticket");
      }

      const { ticket } = await resp.json();
      navigate(`/support/ticket/${ticket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-28 pb-10">
        <Link href="/support">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Support
          </button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 md:p-8">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-1">Open a Support Ticket</h1>
          <p className="text-muted-foreground text-sm mb-6">Describe your issue and we'll get back to you as soon as possible.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
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
    </div>
  );
}
