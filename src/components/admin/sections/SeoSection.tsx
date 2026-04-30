import React, { useState, useEffect, useRef } from "react";
import { Loader2, Check, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionHeader, GlassCard, ActionButton } from "@/components/shared";
import { axiosSecure } from "@/lib/api-client-react";

interface PageSeoData {
  slug: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  keywords: string | null;
}

const PAGE_SLUGS = [
  { slug: "/", label: "Home Page" },
  { slug: "/pricing", label: "Pricing Page" },
  { slug: "/docs", label: "Documentation" },
  { slug: "/blog", label: "Blog Listing" },
  { slug: "/login", label: "Login Page" },
  { slug: "/signup", label: "Signup Page" },
];

function PageSeoEditor({ slug, label }: { slug: string; label: string }) {
  const qc = useQueryClient();
  const slugParam = encodeURIComponent(slug);

  const { data, isLoading } = useQuery<PageSeoData>({
    queryKey: ["/api/admin/site-settings/page", slug],
    queryFn: async () => {
      const response = await axiosSecure.get(`/api/admin/site-settings/page/${slugParam}`);
      return response.data;
    },
  });

  const [form, setForm] = useState<PageSeoData>({
    slug,
    metaTitle: null,
    metaDescription: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    keywords: null,
  });

  const [saved, setSaved] = useState(false);
  const initialised = useRef(false);

  useEffect(() => {
    if (data && !initialised.current) {
      initialised.current = true;
      setForm(data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: PageSeoData) => {
      const response = await axiosSecure.patch(`/api/admin/site-settings/page/${slugParam}`, payload);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/site-settings/page", slug] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  const saving = saveMutation.isPending;
  const error = saveMutation.error ? (saveMutation.error as any).message : null;

  return (
    <GlassCard rounded="rounded-xl" className="border-border/50">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" /> {label}
          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded ml-2">
            {slug}
          </span>
        </h3>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
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
            <ActionButton
              icon={saved ? Check : undefined}
              variant="primary"
              loading={saving}
              onClick={handleSave}
            >
              {saved ? "Saved!" : "Save"}
            </ActionButton>
          </div>
        </div>
      )}
    </GlassCard>
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
