import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, Tag } from "lucide-react";
import { SectionHeader } from "@/components/shared";

const PAGE_SLUGS = [
  { slug: "/", label: "Home (Landing)" },
  { slug: "/pricing", label: "Pricing" },
  { slug: "/docs", label: "Documentation" },
  { slug: "/login", label: "Login" },
  { slug: "/signup", label: "Sign Up" },
];

interface PageSeoData {
  slug: string;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
}

function slugToPathParam(slug: string): string {
  if (slug === "/") return "home";
  return slug.replace(/^\//, "");
}

function PageSeoEditor({ slug, label }: { slug: string; label: string }) {
  const qc = useQueryClient();
  const slugParam = slugToPathParam(slug);
  const { data, isLoading } = useQuery<PageSeoData>({
    queryKey: [`/api/admin/site-settings/page/${slugParam}`],
    queryFn: () =>
      fetch(`/api/admin/site-settings/page/${slugParam}`).then((r) => r.json()),
  });

  const [form, setForm] = useState<Omit<PageSeoData, "slug">>({
    metaTitle: null,
    metaDescription: null,
    keywords: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (data && !initialised.current) {
      initialised.current = true;
      setForm({
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        keywords: data.keywords,
        ogTitle: data.ogTitle,
        ogDescription: data.ogDescription,
        ogImage: data.ogImage,
      });
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/site-settings/page/${slugParam}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Failed to save");
      }
      qc.invalidateQueries({
        queryKey: [`/api/admin/site-settings/page/${slugParam}`],
      });
      qc.invalidateQueries({
        queryKey: [`/api/site-settings/page?slug=${slug}`],
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2 bg-muted/20">
        <Tag className="w-3.5 h-3.5 text-primary" />
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {slug}
        </span>
      </div>
      {isLoading ? (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Meta Title
              </label>
              <input
                type="text"
                value={form.metaTitle ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, metaTitle: e.target.value || null }))
                }
                placeholder="Page title for SEO (max 120 chars)"
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Keywords
              </label>
              <input
                type="text"
                value={form.keywords ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, keywords: e.target.value || null }))
                }
                placeholder="comma, separated, keywords"
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Meta Description
            </label>
            <textarea
              value={form.metaDescription ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  metaDescription: e.target.value || null,
                }))
              }
              placeholder="Page description for search engines (max 320 chars)"
              rows={2}
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                OG Title
              </label>
              <input
                type="text"
                value={form.ogTitle ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ogTitle: e.target.value || null }))
                }
                placeholder="Open Graph title (social previews)"
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                OG Image URL
              </label>
              <input
                type="text"
                value={form.ogImage ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ogImage: e.target.value || null }))
                }
                placeholder="https://example.com/og-image.png"
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              OG Description
            </label>
            <textarea
              value={form.ogDescription ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  ogDescription: e.target.value || null,
                }))
              }
              placeholder="Open Graph description for social sharing"
              rows={2}
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saved ? (
                <Check className="w-3.5 h-3.5" />
              ) : null}
              {saved ? "Saved!" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SeoSection() {
  return (
    <div>
      <SectionHeader
        title="SEO"
        subtitle="Per-page meta titles, descriptions, keywords and Open Graph tags"
      />
      <div className="space-y-4 max-w-3xl">
        {PAGE_SLUGS.map(({ slug, label }) => (
          <PageSeoEditor key={slug} slug={slug} label={label} />
        ))}
      </div>
    </div>
  );
}
