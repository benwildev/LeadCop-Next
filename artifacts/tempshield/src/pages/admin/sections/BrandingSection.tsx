import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, Image, FileText, Globe } from "lucide-react";
import { motion } from "framer-motion";
import CloudinaryUpload from "@/components/CloudinaryUpload";
import { SectionHeader } from "@/components/shared";

interface SiteSettingsData {
  siteTitle: string;
  tagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  globalMetaTitle: string;
  globalMetaDescription: string;
  footerText: string | null;
}

export function BrandingSection() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<SiteSettingsData>({
    queryKey: ["/api/admin/site-settings"],
    queryFn: () => fetch("/api/admin/site-settings").then((r) => r.json()),
  });

  const [form, setForm] = useState<SiteSettingsData>({
    siteTitle: "LeadCop",
    tagline: "Block Fake Emails. Protect Your Platform.",
    logoUrl: null,
    faviconUrl: null,
    globalMetaTitle: "LeadCop — Disposable Email Detection API",
    globalMetaDescription:
      "Industry-leading disposable email detection API. Real-time verification with 99.9% accuracy.",
    footerText: null,
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (data && !initialised.current) {
      initialised.current = true;
      setForm({
        siteTitle: data.siteTitle,
        tagline: data.tagline,
        logoUrl: data.logoUrl,
        faviconUrl: data.faviconUrl,
        globalMetaTitle: data.globalMetaTitle,
        globalMetaDescription: data.globalMetaDescription,
        footerText: data.footerText,
      });
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Failed to save");
      }
      qc.invalidateQueries({ queryKey: ["/api/admin/site-settings"] });
      qc.invalidateQueries({ queryKey: ["/api/site-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    key: keyof SiteSettingsData,
    placeholder?: string,
    hint?: string,
    textarea?: boolean,
  ) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {textarea ? (
        <textarea
          value={(form[key] as string) ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, [key]: e.target.value || null }))
          }
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      ) : (
        <input
          type="text"
          value={(form[key] as string) ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, [key]: e.target.value || null }))
          }
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <div>
      <SectionHeader
        title="Branding"
        subtitle="Customise the site title, logo, favicon and footer"
      />
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="max-w-xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-6 space-y-5"
          >
            <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
              <Image className="w-4 h-4 text-primary" /> Site Identity
            </h3>
            {field(
              "Site Title",
              "siteTitle",
              "LeadCop",
              "Shown in the navbar and footer",
            )}
            {field(
              "Tagline",
              "tagline",
              "Block Fake Emails. Protect Your Platform.",
              "Short hero tagline (optional)",
              true,
            )}
            <CloudinaryUpload
              label="Logo"
              value={form.logoUrl}
              onChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
              hint="Replaces the default Shield icon in the navbar — PNG, SVG or WebP recommended"
            />
            <CloudinaryUpload
              label="Favicon"
              value={form.faviconUrl}
              onChange={(url) => setForm((f) => ({ ...f, faviconUrl: url }))}
              accept="image/png,image/jpeg,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
              hint="Browser tab icon — ICO, PNG or SVG, ideally 32×32 or 64×64 px"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="glass-card rounded-xl p-6 space-y-5"
          >
            <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Global Meta Defaults
            </h3>
            {field(
              "Default Meta Title",
              "globalMetaTitle",
              "LeadCop — Disposable Email Detection API",
              "Used as the browser tab title on all pages",
            )}
            {field(
              "Default Meta Description",
              "globalMetaDescription",
              "",
              "Default SEO description for all pages",
              true,
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="glass-card rounded-xl p-6 space-y-5"
          >
            <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Footer
            </h3>
            {field(
              "Footer Text",
              "footerText",
              "Built for developers, by developers. © 2025 LeadCop.",
              "Overrides the default footer copyright line. Leave blank to use the default.",
              true,
            )}
          </motion.div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : null}
            {saved ? "Saved!" : "Save Branding"}
          </button>
        </div>
      )}
    </div>
  );
}
