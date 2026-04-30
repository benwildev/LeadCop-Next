import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import TiptapEditor from "@/components/shared/TiptapEditor";
import { SectionHeader, GlassCard, ActionButton } from "@/components/shared";
import { axiosSecure } from "@/lib/api-client-react";

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
};

export function BlogAdminSection() {
  const qc = useQueryClient();
  const { data: posts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog/posts"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/admin/blog/posts");
      return response.data;
    },
  });

  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_POST);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof EMPTY_POST & { id?: number }) => {
      const url = payload.id ? `/api/admin/blog/posts/${payload.id}` : "/api/admin/blog/posts";
      const method = payload.id ? "patch" : "post";
      const response = await axiosSecure[method](url, {
        ...payload,
        tags: typeof payload.tags === "string" ? payload.tags.split(",").map(t => t.trim()).filter(Boolean) : payload.tags,
      });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
      setEditing(null);
      setForm(EMPTY_POST);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || err.message || "Failed to save post");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosSecure.delete(`/api/admin/blog/posts/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await axiosSecure.post(`/api/admin/blog/posts/${id}/publish`);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/blog/posts"] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axiosSecure.post("/api/admin/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data.url;
    },
  });

  const openNew = () => {
    setEditing("new");
    setForm(EMPTY_POST);
    setError(null);
  };

  const openEdit = (post: BlogPost) => {
    setEditing(post.id);
    setForm({
      ...post,
      tags: post.tags.join(", "),
      coverImage: post.coverImage || "",
      coverImageAlt: post.coverImageAlt || "",
      seoTitle: post.seoTitle || "",
      seoDescription: post.seoDescription || "",
    } as any);
    setError(null);
  };

  const handleSave = () => {
    saveMutation.mutate(editing === "new" ? form : { ...form, id: editing as number });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this post?")) {
      deleteMutation.mutate(id);
    }
  };

  const handlePublishToggle = (id: number) => {
    publishMutation.mutate(id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file, {
        onSuccess: (url) => {
          setForm(f => ({ ...f, coverImage: url }));
        }
      });
    }
  };

  return (
    <div className="max-w-6xl pb-12">
      <div className="flex items-center justify-between mb-8">
        <SectionHeader
          title="Blog Engine"
          subtitle="Write, edit and publish articles to the LeadCop blog"
        />
        {!editing && (
          <ActionButton icon={Plus} variant="primary" onClick={openNew}>
            New Post
          </ActionButton>
        )}
      </div>

      {editing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <GlassCard rounded="rounded-2xl" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold">
                {editing === "new" ? "Create Post" : "Edit Post"}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">
                    Title
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full bg-background/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    className="w-full bg-background/50 border border-border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">
                    Excerpt
                  </label>
                  <textarea
                    value={form.excerpt}
                    onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                    rows={3}
                    className="w-full bg-background/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">
                    Cover Image
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={form.coverImage}
                      onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))}
                      className="flex-1 bg-background/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <label className="shrink-0 flex items-center justify-center w-11 h-11 bg-primary/10 text-primary border border-primary/20 rounded-xl cursor-pointer hover:bg-primary/20 transition-colors">
                      <input type="file" className="hidden" onChange={handleFileUpload} />
                      {uploadMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">
                      Author
                    </label>
                    <input
                      type="text"
                      value={form.author}
                      onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                      className="w-full bg-background/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={form.tags}
                      onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                      placeholder="news, security, api"
                      className="w-full bg-background/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-muted-foreground">
                Article Content
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
                  {editing === "new" ? "Create Post" : "Save Changes"}
                </ActionButton>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      <GlassCard rounded="rounded-xl" padding="p-0" className="overflow-hidden">
        {isLoading ? (
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
                        disabled={publishMutation.isPending && publishMutation.variables === post.id}
                        title={
                          post.status === "PUBLISHED" ? "Unpublish" : "Publish"
                        }
                        className={`p-1.5 rounded-lg transition-colors ${post.status === "PUBLISHED" ? "text-green-400 hover:text-muted-foreground hover:bg-muted" : "text-muted-foreground hover:text-green-400 hover:bg-green-500/10"}`}
                      >
                        {publishMutation.isPending && publishMutation.variables === post.id ? (
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
                        disabled={deleteMutation.isPending && deleteMutation.variables === post.id}
                        title="Delete"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        {deleteMutation.isPending && deleteMutation.variables === post.id ? (
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
