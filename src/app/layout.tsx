import type { Metadata } from "next";
import "@/styles/globals.css";
import { RootProvider } from "@/components/providers/root-provider";

export const metadata: Metadata = {
  title: {
    default: "LeadCop | Stop Fake Signups and Disposable Emails",
    template: "%s | LeadCop"
  },
  metadataBase: new URL(process.env.APP_URL || 'https://leadcop.io'),
  description: "Block disposable emails, bot signups, relay inboxes, and low-quality leads before they reach your CRM or email platform. 55k+ providers tracked.",
  keywords: ["disposable email detection", "fake signup prevention", "lead validation", "anti-spam api", "temporary email blocker"],
  authors: [{ name: "LeadCop Team" }],
  creator: "LeadCop",
  publisher: "LeadCop",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://leadcop.io",
    siteName: "LeadCop",
    title: "LeadCop | Stop Fake Signups and Disposable Emails",
    description: "Instantly identify temporary email providers and bot traffic before they reach your inbox.",
    images: [
      {
        url: "/images/opengraph.jpg",
        width: 1200,
        height: 630,
        alt: "LeadCop Dashboard"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadCop | Stop Fake Signups and Disposable Emails",
    description: "Instantly identify temporary email providers and bot traffic before they reach your inbox.",
    images: ["/images/opengraph.jpg"]
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

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
