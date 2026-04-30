import type { Metadata } from "next";
import { BlogSlugContent } from "./BlogSlugContent";

export const metadata: Metadata = {
  title: "LeadCop Blog Article | LeadCop",
  description: "Read how LeadCop protects your signup funnel with email verification, disposable detection, and lead quality guidance.",
  openGraph: {
    title: "LeadCop Blog Article | LeadCop",
    description: "Read how LeadCop protects your signup funnel with email verification, disposable detection, and lead quality guidance.",
    url: "https://leadcop.io/blog",
  },
};

export default function BlogPostPage() {
  return <BlogSlugContent />;
}
