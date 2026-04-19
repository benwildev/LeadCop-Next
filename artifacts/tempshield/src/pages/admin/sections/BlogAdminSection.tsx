import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Loader2,
  Plus,
  Check,
  Trash2,
  FileText,
  ExternalLink,
  CheckCircle,
  Upload,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import MarkdownEditor from "@/components/MarkdownEditor";
import { SectionHeader, GlassCard, ActionButton } from "@/components/shared";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  coverImage: string | null;
  coverImageAlt: string | null;
  tags: string[];
  status: "DRAFT" | "PUBLISHED";
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const EMPTY_POST = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  author: "LeadCop Team",
  coverImage: "",
  coverImageAlt: "",
  tags: "",
  status: "DRAFT" as "DRAFT" | "PUBLISHED",
  seoTitle: "",
  seoDescription: "",
  ogImage: "",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function BlogAdminSection() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_POST);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [publishing, setPublishing] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const postsQuery = useQuery<{ posts: BlogPost[] }>({
    queryKey: ["/api/admin/blog/posts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/blog/posts", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
  });

  const posts = postsQuery.data?.posts ?? [];

  const openCreate = () => {
    setForm(EMPTY_POST);
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (post: BlogPost) => {
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      author: post.author,
      coverImage: post.coverImage ?? "",
      coverImageAlt: post.coverImageAlt ?? "",
      tags: Array.isArray(post.tags) ? post.tags.join(", ") : "",
      status: post.status,
      seoTitle: post.seoTitle ?? "",
      seoDescription: post.seoDescription ?? "",
      ogImage: post.ogImage ?? "",
    });
    setEditing(post);
    setCreating(false);
  };

  const handleClose = () => {
    setEditing(null);
    setCreating(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Upload failed");
        return;
      }
      const { url } = await res.json();
      setForm((f) => ({ ...f, coverImage: url }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        ...form,
        coverImage: form.coverImage || null,
        coverImageAlt: form.coverImageAlt || null,
        seoTitle: form.seoTitle || null,
        seoDescription: form.seoDescription || null,
        ogImage: form.ogImage || null,
      };
      const url = editing
        ? `/api/admin/blog/posts/${editing.id}`
        : "/api/admin/blog/posts";
      const method = editing ? "PATCH" : "POST";
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
      qc.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/blog/posts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      qc.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
    } finally {
      setDeleting(null);
    }
  };

  const handlePublishToggle = async (id: number) => {
    setPublishing(id);
    try {
      const res = await fetch(`/api/admin/blog/posts/${id}/publish`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Failed");
        return;
      }
      qc.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
    } finally {
      setPublishing(null);
    }
  };

  const isFormOpen = creating || !!editing;

  return (
    <div>
      <SectionHeader
        title="Blog"
        subtitle="Create and manage blog posts"
        action={
          <ActionButton icon={Plus} variant="primary" onClick={openCreate}>
            New Post
          </ActionButton>
        }
      />

      {isFormOpen && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <GlassCard rounded="rounded-2xl" className="border border-primary/20">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
            {editing ? "Edit Post" : "New Post"}
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Title
              </label>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    title: e.target.value,
                    slug: f.slug || slugify(e.target.value),
                  }))
                }
                placeholder="Post title…"
                className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Slug
              </label>
              <input
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                }
                placeholder="url-friendly-slug"
                className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Author
              </label>
              <input
                value={form.author}
                onChange={(e) =>
                  setForm((f) => ({ ...f, author: e.target.value }))
                }
                placeholder="Author name"
                className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as "DRAFT" | "PUBLISHED",
                  }))
                }
                className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Cover Image
              </label>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              {form.coverImage ? (
                <div className="relative rounded-lg overflow-hidden border border-border h-36 bg-muted/30">
                  <img
                    src={form.coverImage}
                    alt={form.coverImageAlt || "Cover preview"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur text-white text-xs font-medium hover:bg-white/30 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, coverImage: "", coverImageAlt: "" }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/30 backdrop-blur text-white text-xs font-medium hover:bg-red-500/50 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-36 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                  <span className="text-xs font-medium">
                    {uploading ? "Uploading to Cloudinary…" : "Click to upload cover image"}
                  </span>
                  <span className="text-xs opacity-60">JPG, PNG, WebP — max 5 MB</span>
                </button>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Image Alt Text / Title
              </label>
              <input
                value={form.coverImageAlt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, coverImageAlt: e.target.value }))
                }
                placeholder="Describe the image for SEO and accessibility…"
                className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Tags
              </label>
              <input
                value={form.tags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value }))
                }
                placeholder="email marketing, lead generation, guides (comma-separated)"
                className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Excerpt
              </label>
              <textarea
                value={form.excerpt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, excerpt: e.target.value }))
                }
                placeholder="Short description shown on the blog list…"
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Content
              </label>
              <MarkdownEditor
                value={form.content}
                onChange={(content) => setForm((f) => ({ ...f, content }))}
                placeholder="## Your article content in Markdown..."
                minHeight={440}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                SEO Title
              </label>
              <input
                value={form.seoTitle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, seoTitle: e.target.value }))
                }
                placeholder="SEO title override (optional)"
                className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                SEO Description
              </label>
              <input
                value={form.seoDescription}
                onChange={(e) =>
                  setForm((f) => ({ ...f, seoDescription: e.target.value }))
                }
                placeholder="SEO meta description (optional)"
                className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                OG Image URL
              </label>
              <input
                value={form.ogImage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ogImage: e.target.value }))
                }
                placeholder="https://example.com/og-image.jpg (optional)"
                className="w-full px-3 py-2 rounded-lg bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <ActionButton
              icon={Check}
              variant="primary"
              loading={saving}
              onClick={handleSave}
            >
              {editing ? "Save Changes" : "Create Post"}
            </ActionButton>
            <ActionButton variant="ghost" onClick={handleClose}>
              Cancel
            </ActionButton>
          </div>
          </GlassCard>
        </motion.div>
      )}

      <GlassCard rounded="rounded-xl" padding="p-0" className="overflow-hidden">
        {postsQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No blog posts yet. Create your first one!
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="border-b border-border">
              <tr>
                {["Title", "Status", "Author", "Published", "Actions"].map(
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
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground line-clamp-1">
                      {post.title}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      /blog/{post.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${post.status === "PUBLISHED" ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground"}`}
                    >
                      {post.status === "PUBLISHED" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {post.author}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {post.publishedAt
                      ? format(parseISO(post.publishedAt), "MMM d, yyyy")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePublishToggle(post.id)}
                        disabled={publishing === post.id}
                        title={
                          post.status === "PUBLISHED" ? "Unpublish" : "Publish"
                        }
                        className={`p-1.5 rounded-lg transition-colors ${post.status === "PUBLISHED" ? "text-green-400 hover:text-muted-foreground hover:bg-muted" : "text-muted-foreground hover:text-green-400 hover:bg-green-500/10"}`}
                      >
                        {publishing === post.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => openEdit(post)}
                        title="Edit"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deleting === post.id}
                        title="Delete"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        {deleting === post.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>
    </div>
  );
}
