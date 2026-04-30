import type { Metadata } from "next";
import { BlogContent } from "./BlogContent";

export const metadata: Metadata = {
  title: "LeadCop Blog | Lead quality, email validation, and acquisition strategy",
  description: "Read LeadCop articles on lead quality, email verification, anti-spam strategy, and how to protect your signup funnel.",
  openGraph: {
    title: "LeadCop Blog | Lead quality, email validation, and acquisition strategy",
    description: "Read LeadCop articles on lead quality, email verification, anti-spam strategy, and how to protect your signup funnel.",
    url: "https://leadcop.io/blog",
  },
};

export default function BlogPage() {
  return <BlogContent />;
}
