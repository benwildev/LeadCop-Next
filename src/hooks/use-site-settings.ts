"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { axiosSecure } from "@/lib/api-client-react";

interface SiteSettings {
  siteTitle: string;
  globalMetaTitle: string;
  globalMetaDescription: string;
  faviconUrl: string | null;
  logoUrl: string | null;
  iconUrl: string | null;
  footerText?: string | null;
}

interface PageSeo {
  slug: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  keywords: string | null;
}

const DEFAULTS: SiteSettings = {
  siteTitle: "LeadCop",
  globalMetaTitle: "LeadCop | Stop Fake Signups and Disposable Emails",
  globalMetaDescription:
    "Block disposable emails, bot signups, relay inboxes, and low-quality leads before they reach your CRM or email platform.",
  faviconUrl: null,
  logoUrl: null,
  iconUrl: null,
};

const ALLOWED_SLUGS = new Set(["/", "/pricing", "/docs", "/blog", "/login", "/signup"]);

const PAGE_FALLBACKS: Record<string, { title: string; description: string; keywords?: string; type: string }> = {
  "/": {
    title: "LeadCop | Stop Fake Signups and Disposable Emails",
    description:
      "Block disposable emails, bot signups, relay inboxes, and low-quality leads before they reach your CRM or email platform.",
    keywords: "disposable email blocker, bot signup prevention, lead quality, temporary email detection",
    type: "website",
  },
  "/pricing": {
    title: "LeadCop Pricing | Disposable Email Protection Plans",
    description:
      "Compare LeadCop plans for disposable email detection, lead filtering, and real-time signup protection.",
    keywords: "LeadCop pricing, email verification pricing, disposable email API pricing",
    type: "website",
  },
  "/docs": {
    title: "LeadCop Docs | Integration and API Reference",
    description:
      "Learn how to integrate LeadCop on websites, forms, WordPress, and custom apps with the API and frontend script.",
    keywords: "LeadCop docs, email verification API docs, signup form integration",
    type: "website",
  },
  "/login": {
    title: "Log In | LeadCop",
    description: "Access your LeadCop dashboard to monitor email checks, lead quality, and account settings.",
    type: "website",
  },
  "/signup": {
    title: "Create Your LeadCop Account",
    description: "Start using LeadCop to block fake emails and protect your signup forms in minutes.",
    type: "website",
  },
  "/blog": {
    title: "LeadCop Blog | Email Validation & Lead Quality Insights",
    description:
      "Articles, guides, and practical insights on blocking disposable emails, protecting signup funnels, and improving lead quality.",
    keywords: "email validation blog, lead quality articles, disposable email protection",
    type: "website",
  },
};

export function useSiteSettings(): SiteSettings {
  const { data } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/site-settings");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  return data ?? DEFAULTS;
}

export function usePageSeo(slug: string): PageSeo | null {
  const enabled = ALLOWED_SLUGS.has(slug);
  const { data } = useQuery<PageSeo>({
    queryKey: [`/api/site-settings/page?slug=${slug}`],
    queryFn: async () => {
      const response = await axiosSecure.get(`/api/site-settings/page?slug=${encodeURIComponent(slug)}`);
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
  return data ?? null;
}

export function useApplyHeadMeta() {
  const settings = useSiteSettings();
  const location = usePathname();

  const pageSeo = usePageSeo(location);

  useEffect(() => {
    const fallback = PAGE_FALLBACKS[location];
    const title = pageSeo?.metaTitle || fallback?.title || settings.globalMetaTitle;
    const description =
      pageSeo?.metaDescription || fallback?.description || settings.globalMetaDescription;
    const keywords = pageSeo?.keywords ?? fallback?.keywords ?? null;
    const ogTitle = pageSeo?.ogTitle || title;
    const ogDescription = pageSeo?.ogDescription || description;
    const ogImage = pageSeo?.ogImage ?? null;
    const canonicalUrl = getCanonicalUrl(location);
    const ogType = fallback?.type || "website";

    document.title = title;

    setMeta("name", "description", description);
    setMeta("name", "robots", "index,follow");
    setMeta("name", "twitter:card", ogImage ? "summary_large_image" : "summary");
    setMeta("name", "twitter:title", ogTitle);
    setMeta("name", "twitter:description", ogDescription);

    if (keywords) {
      setMeta("name", "keywords", keywords);
    } else {
      removeMeta("name", "keywords");
    }

    setMeta("property", "og:title", ogTitle);
    setMeta("property", "og:description", ogDescription);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:site_name", settings.siteTitle);

    if (ogImage) {
      setMeta("property", "og:image", ogImage);
      setMeta("name", "twitter:image", ogImage);
    } else {
      removeMeta("property", "og:image");
      removeMeta("name", "twitter:image");
    }

    if (settings.faviconUrl) {
      setFavicon(settings.faviconUrl);
    }

    setCanonical(canonicalUrl);
  }, [settings, pageSeo, location]);
}

function getCanonicalUrl(pathname: string) {
  if (typeof window === "undefined") return pathname;
  return new URL(pathname, window.location.origin).toString();
}

export function setMeta(attr: "name" | "property", value: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${value}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function removeMeta(attr: "name" | "property", value: string) {
  const el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${value}"]`);
  if (el) el.remove();
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

export function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}
