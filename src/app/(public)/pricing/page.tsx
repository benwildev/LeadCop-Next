import type { Metadata } from "next";
import { PricingContent } from "./PricingContent";

export const metadata: Metadata = {
  title: "LeadCop Pricing | Flexible plans for lead quality protection",
  description: "Choose the LeadCop plan that fits your growth stage and protect your signup funnel with scalable disposable email detection and lead verification.",
  openGraph: {
    title: "LeadCop Pricing | Flexible plans for lead quality protection",
    description: "Choose the LeadCop plan that fits your growth stage and protect your signup funnel with scalable disposable email detection and lead verification.",
    url: "https://leadcop.io/pricing",
  },
};

export default function PricingPage() {
  return <PricingContent />;
}
