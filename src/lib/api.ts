export type LandingFeature = {
  icon: "shield" | "zap" | "bar-chart";
  title: string;
  desc: string;
};

export type LandingBenefit = {
  title: string;
  desc: string;
};

export type LandingTestimonial = {
  quote: string;
  name: string;
  role: string;
};

export type LandingPlan = {
  plan: string;
  price: number;
  requestLimit: number;
  description: string;
  features: string[];
};

export type LandingMetadata = {
  title: string;
  description: string;
  keywords: string[];
  openGraph: {
    title: string;
    description: string;
    url: string;
    images: string[];
  };
  canonical: string;
};

export async function getLandingContent() {
  return {
    features: [
      {
        icon: "shield",
        title: "Disposable Email Detection",
        desc: "We track 50,000+ temporary email providers and refresh our list every 15 minutes.",
      },
      {
        icon: "zap",
        title: "Real-time Verification",
        desc: "Our API responds in under 40ms globally, ensuring no friction for your real users.",
      },
      {
        icon: "bar-chart",
        title: "Intelligent Lead Scoring",
        desc: "We look beyond the domain, analyzing patterns to predict lead quality and intent.",
      },
    ] as LandingFeature[],
    benefits: [
      {
        title: "WordPress Plugin",
        desc: "One-click install for WooCommerce, Contact Form 7, and WPForms.",
      },
      {
        title: "Universal Script Tag",
        desc: "Paste our lightweight script tag into any HTML site to protect it instantly.",
      },
      {
        title: "Developer First API",
        desc: "Standard JSON API with deep documentation for custom integrations.",
      },
    ] as LandingBenefit[],
    testimonials: [
      {
        quote: "Cleaned up our CRM in 48 hours. Sales team is finally happy with lead quality.",
        name: "Marcus T.",
        role: "E-commerce founder",
      },
      {
        quote: "The plugin was simple enough that marketing handled setup without engineering.",
        name: "Rachel K.",
        role: "Growth consultant",
      },
      {
        quote: "Paid signup campaigns became easier to trust because fake leads dropped off immediately.",
        name: "David M.",
        role: "SaaS operator",
      },
    ] as LandingTestimonial[],
    plans: [
      {
        plan: "FREE",
        price: 0,
        requestLimit: 1000,
        description: "Start with basic disposable email protection.",
        features: ["Basic verification API", "1,000 checks/mo", "Email support"],
      },
      {
        plan: "BASIC",
        price: 29,
        requestLimit: 50000,
        description: "Protect growth campaigns with faster checks and analytics.",
        features: ["Real-time email scanning", "50,000 checks/mo", "Priority support"],
      },
      {
        plan: "CUSTOM",
        price: 0,
        requestLimit: -1,
        description: "Custom volume, dedicated support, and SLA-ready protection.",
        features: ["Unlimited domains", "Dedicated account manager", "Onboarding support"],
      },
    ] as LandingPlan[],
  };
}

export async function getLandingMetadata(): Promise<LandingMetadata> {
  return {
    title: "LeadCop | Stop Fake Signups and Disposable Emails",
    description: "Protect your signup flow from temporary email providers, bots, and low-quality leads with LeadCop's real-time email verification and lead validation API.",
    keywords: ["disposable email detection", "fake signup prevention", "lead validation", "email verification API"],
    openGraph: {
      title: "LeadCop | Stop Fake Signups and Disposable Emails",
      description: "Protect your signup flow from temporary email providers, bots, and low-quality leads with LeadCop's real-time email verification and lead validation API.",
      url: "https://leadcop.io",
      images: ["/images/opengraph.jpg"],
    },
    canonical: "https://leadcop.io",
  };
}
