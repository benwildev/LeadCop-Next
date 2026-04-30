import type { Metadata } from "next";
import { DocsContent } from "./DocsContent";

export const metadata: Metadata = {
  title: "LeadCop Docs | API documentation and developer guides",
  description: "Explore LeadCop API docs, integration guides, authentication details, error codes, and examples for real-time signup protection.",
  openGraph: {
    title: "LeadCop Docs | API documentation and developer guides",
    description: "Explore LeadCop API docs, integration guides, authentication details, error codes, and examples for real-time signup protection.",
    url: "https://leadcop.io/docs",
  },
};

export default function DocsPage() {
  return <DocsContent />;
}
