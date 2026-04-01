import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export interface SiteSettings {
  siteTitle: string;
  tagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  globalMetaTitle: string;
  globalMetaDescription: string;
  footerText: string | null;
}

const DEFAULTS: SiteSettings = {
  siteTitle: "TempShield",
  tagline: "Block Fake Emails. Protect Your Platform.",
  logoUrl: null,
  faviconUrl: null,
  globalMetaTitle: "TempShield — Disposable Email Detection API",
  globalMetaDescription: "Industry-leading disposable email detection API. Real-time verification with 99.9% accuracy.",
  footerText: null,
};

export function useSiteSettings(): SiteSettings {
  const { data } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
    queryFn: () => fetch("/api/site-settings").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });
  return data ?? DEFAULTS;
}

export function useApplyHeadMeta(overrides?: {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
}) {
  const settings = useSiteSettings();

  useEffect(() => {
    const title = overrides?.title || settings.globalMetaTitle;
    const description = overrides?.description || settings.globalMetaDescription;
    const keywords = overrides?.keywords || null;

    document.title = title;

    setMeta("name", "description", description);
    if (keywords) setMeta("name", "keywords", keywords);

    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);

    if (settings.faviconUrl) {
      setFavicon(settings.faviconUrl);
    }
  }, [settings, overrides?.title, overrides?.description, overrides?.keywords]);
}

function setMeta(attr: "name" | "property", value: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${value}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setFavicon(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "icon";
    document.head.appendChild(el);
  }
  el.href = href;
}
