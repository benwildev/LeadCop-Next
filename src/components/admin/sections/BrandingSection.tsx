import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, Image, FileText, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { CloudinaryUpload } from "@/components/shared/CloudinaryUpload";
import { SectionHeader, GlassCard, ActionButton } from "@/components/shared";
import { axiosSecure } from "@/lib/api-client-react";

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
    queryFn: async () => {
      const response = await axiosSecure.get("/api/admin/site-settings");
      return response.data;
    },
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
  const initialised = useRef(false);

  useEffect(() => {
    if (data && !initialised.current) {
      initialised.current = true;
      setForm(data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: SiteSettingsData) => {
      const response = await axiosSecure.patch("/api/admin/site-settings", payload);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/site-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(form);
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard rounded="rounded-xl" className="space-y-5">
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
              onChange={(url: string | null) => setForm((f) => ({ ...f, logoUrl: url }))}
              hint="Replaces the default mark. Ideal size: 250×100 px (horizontal) or 160×160 px (square). High-res: 1024×768 px."
            />
            <CloudinaryUpload
              label="Favicon"
              value={form.faviconUrl}
              onChange={(url: string | null) => setForm((f) => ({ ...f, faviconUrl: url }))}
              accept="image/png,image/jpeg,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
              hint="Browser tab icon — ICO, PNG or SVG, ideally 32×32 or 64×64 px"
            />
          </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <GlassCard rounded="rounded-xl" className="space-y-5">
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
          </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <GlassCard rounded="rounded-xl" className="space-y-5">
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
          </GlassCard>
          </motion.div>

          {saveMutation.error && <p className="text-sm text-red-400">{(saveMutation.error as any).message || "Save failed"}</p>}

          <ActionButton
            icon={saved ? Check : undefined}
            variant="primary"
            loading={saveMutation.isPending}
            onClick={handleSave}
          >
            {saved ? "Saved!" : "Save Branding"}
          </ActionButton>
        </div>
      )}
    </div>
  );
}
