import type { Metadata } from "next";
import "@/styles/globals.css";
import { RootProvider } from "@/components/providers/root-provider";

import { db, siteSettingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function generateMetadata(): Promise<Metadata> {
  const [settings] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.id, 1)).limit(1);
  
  const siteTitle = settings?.siteTitle || "LeadCop";
  const title = settings?.globalMetaTitle || "LeadCop | Stop Fake Signups and Disposable Emails";
  const description = settings?.globalMetaDescription || "Block disposable emails, bot signups, relay inboxes, and low-quality leads before they reach your CRM or email platform. 55k+ providers tracked.";
  const favicon = settings?.faviconUrl || "/favicon.svg";

  return {
    title: {
      default: title,
      template: `%s | ${siteTitle}`
    },
    metadataBase: new URL(process.env.APP_URL || 'https://leadcop.io'),
    description,
    keywords: ["disposable email detection", "fake signup prevention", "lead validation", "anti-spam api", "temporary email blocker"],
    authors: [{ name: "LeadCop Team" }],
    creator: "LeadCop",
    publisher: "LeadCop",
    robots: "index, follow",
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "https://leadcop.io",
      siteName: siteTitle,
      title,
      description,
      images: [
        {
          url: "/images/opengraph.jpg",
          width: 1200,
          height: 630,
          alt: `${siteTitle} Dashboard`
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/opengraph.jpg"]
    },
    icons: {
      icon: [
        { url: favicon },
      ],
      shortcut: favicon,
      apple: favicon,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <RootProvider>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
