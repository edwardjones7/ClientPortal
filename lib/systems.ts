/**
 * The "book of systems" — the productized systems Elenos runs for clients.
 *
 * Static for now: every client sees the same list. When we move to per-org
 * entitlements, this becomes the source of metadata (name/image/copy) joined
 * against an org's enabled slugs. Add a new system by appending an entry and
 * dropping its illustration in /public/systems.
 */

export type SystemStatus = "live" | "soon";

export interface PortalSystem {
  slug: string;
  name: string;
  /** Path under /public. */
  image: string;
  /** One-line summary shown under the title. */
  tagline: string;
  /** 1–2 sentence description. */
  description: string;
  status: SystemStatus;
}

export const SYSTEMS: PortalSystem[] = [
  {
    slug: "websites",
    name: "Websites",
    image: "/systems/website.svg",
    tagline: "Your site, fully managed",
    description:
      "Design, hosting, and ongoing updates for your marketing site — handled end-to-end by Elenos. Need a change? Open a ticket.",
    status: "live",
  },
  {
    slug: "ai-receptionist",
    name: "AI Receptionist",
    image: "/systems/receptionist.svg",
    tagline: "Always-on call handling",
    description:
      "An AI receptionist that answers calls 24/7, books appointments, and routes messages to you — so you never miss a customer.",
    status: "live",
  },
  {
    slug: "landing-pages",
    name: "Landing Pages & Funnels",
    image: "/systems/landing-pages.svg",
    tagline: "High-converting pages built for campaigns",
    description:
      "Fast, focused pages engineered to turn clicks into customers — built, tested, and tuned by Elenos for each campaign.",
    status: "live",
  },
  {
    slug: "booking-site",
    name: "Booking Sites",
    image: "/systems/booking-site.svg",
    tagline: "A site whose whole job is filling your calendar",
    description:
      "A streamlined site built around one goal: turning visitors into booked appointments, synced straight to your calendar.",
    status: "live",
  },
  {
    slug: "blog-seo",
    name: "Blog & SEO Content Hub",
    image: "/systems/blog-seo.svg",
    tagline: "Ranking content, published for you",
    description:
      "A content engine that publishes SEO-tuned articles to grow your organic search traffic month over month.",
    status: "live",
  },
  {
    slug: "membership-site",
    name: "Membership Sites",
    image: "/systems/membership-site.svg",
    tagline: "Gated content and recurring access",
    description:
      "Logins, gated content, and recurring access — a members-only area Elenos builds and keeps running.",
    status: "live",
  },
  {
    slug: "event-microsite",
    name: "Event & Microsites",
    image: "/systems/event-microsite.svg",
    tagline: "Fast, focused sites for launches and events",
    description:
      "A sharp standalone site for a launch, event, or campaign — spun up fast and ready the moment you need it.",
    status: "live",
  },
  {
    slug: "multi-location",
    name: "Multi-Location Sites",
    image: "/systems/multi-location.svg",
    tagline: "One brand, every location, managed centrally",
    description:
      "Location pages, hours, and listings for every storefront — one brand, managed from a single source.",
    status: "live",
  },
  {
    slug: "online-store",
    name: "Online Store",
    image: "/systems/online-store.svg",
    tagline: "A full storefront, built and run for you",
    description:
      "A complete storefront — products, checkout, payments, and shipping — built end-to-end so you just fulfill orders.",
    status: "live",
  },
  {
    slug: "subscription-commerce",
    name: "Subscription Commerce",
    image: "/systems/subscription-commerce.svg",
    tagline: "Recurring billing and subscriber management",
    description:
      "Plans, recurring billing, and subscriber management for products or services that bill on repeat.",
    status: "live",
  },
  {
    slug: "digital-products",
    name: "Digital Products Store",
    image: "/systems/digital-products.svg",
    tagline: "Sell downloads, courses, and licenses",
    description:
      "Sell downloads, courses, and licenses with instant delivery and secure access — no inventory required.",
    status: "live",
  },
  {
    slug: "marketplace",
    name: "Marketplace",
    image: "/systems/marketplace.svg",
    tagline: "Multi-vendor platform with payouts",
    description:
      "A multi-vendor platform with listings, seller accounts, and payouts — your own marketplace, fully managed.",
    status: "live",
  },
  {
    slug: "inventory-orders",
    name: "Inventory & Order Ops",
    image: "/systems/inventory-orders.svg",
    tagline: "Stock, fulfillment, and orders in one place",
    description:
      "Stock levels, orders, and fulfillment tracked together so nothing oversells or slips through the cracks.",
    status: "live",
  },
  {
    slug: "cart-recovery",
    name: "Cart Recovery",
    image: "/systems/cart-recovery.svg",
    tagline: "Win back abandoned checkouts automatically",
    description:
      "Automatic follow-ups that bring back shoppers who abandoned checkout — recovered revenue on autopilot.",
    status: "live",
  },
  {
    slug: "ai-sales-agent",
    name: "AI Sales Agent",
    image: "/systems/ai-sales-agent.svg",
    tagline: "Qualifies and books leads around the clock",
    description:
      "An always-on sales rep that qualifies leads, answers questions, and books meetings while you sleep.",
    status: "live",
  },
  {
    slug: "ai-support-agent",
    name: "AI Support Agent",
    image: "/systems/ai-support-agent.svg",
    tagline: "Resolves customer questions over chat & email",
    description:
      "Resolves customer questions over chat and email instantly, escalating to you only when it truly matters.",
    status: "live",
  },
  {
    slug: "ai-voice-agent",
    name: "AI Voice Agent",
    image: "/systems/ai-voice-agent.svg",
    tagline: "Natural phone conversations that take action",
    description:
      "A natural-sounding voice agent that handles phone calls and takes real action — bookings, answers, and routing.",
    status: "live",
  },
  {
    slug: "ai-booking-agent",
    name: "AI Booking Agent",
    image: "/systems/ai-booking-agent.svg",
    tagline: "Schedules appointments through any channel",
    description:
      "Books and reschedules appointments across phone, chat, and web — straight into your calendar.",
    status: "live",
  },
  {
    slug: "ai-knowledge-assistant",
    name: "AI Knowledge Assistant",
    image: "/systems/ai-knowledge-assistant.svg",
    tagline: "A copilot trained on your business docs",
    description:
      "A copilot trained on your docs and processes, giving your team instant, accurate answers on demand.",
    status: "live",
  },
  {
    slug: "ai-lead-qualifier",
    name: "AI Lead Qualifier",
    image: "/systems/ai-lead-qualifier.svg",
    tagline: "Scores and routes every inbound lead",
    description:
      "Scores every inbound lead and routes the hot ones to you first — no more manual triage.",
    status: "live",
  },
  {
    slug: "ai-content-writer",
    name: "AI Content Writer",
    image: "/systems/ai-content-writer.svg",
    tagline: "On-brand copy, posts, and emails on demand",
    description:
      "On-brand posts, emails, and copy generated on demand and ready for your quick review.",
    status: "live",
  },
  {
    slug: "ai-document-processor",
    name: "AI Document Processor",
    image: "/systems/ai-document-processor.svg",
    tagline: "Reads, extracts, and files paperwork",
    description:
      "Reads invoices, forms, and contracts, extracts the data, and files it exactly where it belongs.",
    status: "live",
  },
  {
    slug: "ai-social-manager",
    name: "AI Social Manager",
    image: "/systems/ai-social-manager.svg",
    tagline: "Plans, writes, and schedules your social",
    description:
      "Plans, writes, and schedules your social content so your channels stay active without the busywork.",
    status: "live",
  },
  {
    slug: "workflow-automations",
    name: "Workflow Automations",
    image: "/systems/workflow-automations.svg",
    tagline: "Custom automations across your tools",
    description:
      "Custom automations that connect your tools and run the repetitive work for you, 24/7.",
    status: "live",
  },
  {
    slug: "crm-automation",
    name: "CRM Automation",
    image: "/systems/crm-automation.svg",
    tagline: "A pipeline that updates and follows up itself",
    description:
      "A CRM that updates itself — logging activity, moving deals, and triggering follow-ups automatically.",
    status: "live",
  },
  {
    slug: "lead-followup",
    name: "Lead Follow-Up Sequences",
    image: "/systems/lead-followup.svg",
    tagline: "No lead ever goes cold",
    description:
      "Timed follow-up sequences over email and SMS so every lead gets worked and none go cold.",
    status: "live",
  },
  {
    slug: "invoicing-payments",
    name: "Invoicing & Payments",
    image: "/systems/invoicing-payments.svg",
    tagline: "Billing and reconciliation, automated",
    description:
      "Invoices, reminders, and reconciliation handled automatically — get paid faster with far less chasing.",
    status: "live",
  },
  {
    slug: "client-onboarding",
    name: "Client Onboarding",
    image: "/systems/client-onboarding.svg",
    tagline: "Turn a new signup into a ready client, hands-off",
    description:
      "Turn a new signup into a fully set-up client automatically — forms, accounts, and welcome flows included.",
    status: "live",
  },
  {
    slug: "reviews-reputation",
    name: "Reviews & Reputation",
    image: "/systems/reviews-reputation.svg",
    tagline: "Automatic review requests after every job",
    description:
      "Automatic review requests after every job to grow your ratings and online reputation on autopilot.",
    status: "live",
  },
  {
    slug: "document-generation",
    name: "Document Generation",
    image: "/systems/document-generation.svg",
    tagline: "Proposals and contracts built from your data",
    description:
      "Proposals, contracts, and reports generated from your data in seconds, ready to send.",
    status: "live",
  },
  {
    slug: "integrations-sync",
    name: "Integrations & Data Sync",
    image: "/systems/integrations-sync.svg",
    tagline: "Keep all your apps speaking to each other",
    description:
      "Keep all your apps in sync so data flows between them automatically — no copy-paste.",
    status: "live",
  },
  {
    slug: "reporting-dashboards",
    name: "Reporting Dashboards",
    image: "/systems/reporting-dashboards.svg",
    tagline: "Live numbers, no spreadsheets",
    description:
      "Live dashboards that pull your numbers together automatically — the end of manual spreadsheets.",
    status: "live",
  },
  {
    slug: "client-portal",
    name: "Client Portal",
    image: "/systems/client-portal.svg",
    tagline: "A branded hub for your customers",
    description:
      "A branded hub where your customers log in to track work, chat, and self-serve — exactly like this one.",
    status: "live",
  },
  {
    slug: "member-portal",
    name: "Member Portal",
    image: "/systems/member-portal.svg",
    tagline: "Logins, content, and self-service for members",
    description:
      "Member logins, content, and self-service in one branded space that you fully control.",
    status: "live",
  },
  {
    slug: "team-intranet",
    name: "Team Intranet",
    image: "/systems/team-intranet.svg",
    tagline: "Your company's internal home base",
    description:
      "A private home base for your team — docs, tools, and updates gathered in one internal hub.",
    status: "live",
  },
  {
    slug: "partner-portal",
    name: "Partner & Vendor Portal",
    image: "/systems/partner-portal.svg",
    tagline: "Shared workspace for outside partners",
    description:
      "A shared workspace where partners and vendors collaborate, submit, and track — outside your walls.",
    status: "live",
  },
  {
    slug: "patient-portal",
    name: "Patient Portal",
    image: "/systems/patient-portal.svg",
    tagline: "Secure access for healthcare clients",
    description:
      "Secure, compliant access for patients to forms, records, and messaging.",
    status: "live",
  },
  {
    slug: "learning-portal",
    name: "Course & Learning Portal",
    image: "/systems/learning-portal.svg",
    tagline: "Sell and deliver training",
    description:
      "Host and sell courses with lessons, progress tracking, and student logins.",
    status: "live",
  },
  {
    slug: "internal-dashboard",
    name: "Internal Dashboard",
    image: "/systems/internal-dashboard.svg",
    tagline: "A custom admin to run your operation",
    description:
      "A custom admin built around how you actually run operations — your data, your workflow.",
    status: "live",
  },
  {
    slug: "project-management",
    name: "Project Management Tool",
    image: "/systems/project-management.svg",
    tagline: "Tasks and delivery, tailored to you",
    description:
      "Tasks, timelines, and delivery tracking tailored to exactly how your team works.",
    status: "live",
  },
  {
    slug: "email-marketing",
    name: "Email Marketing",
    image: "/systems/email-marketing.svg",
    tagline: "Campaigns and automated flows that sell",
    description:
      "Campaigns and automated flows that nurture your list and drive repeat sales.",
    status: "live",
  },
  {
    slug: "sms-marketing",
    name: "SMS Marketing",
    image: "/systems/sms-marketing.svg",
    tagline: "Texts your customers actually open",
    description:
      "Text campaigns with the open rates email can only dream of — promos, drops, and reminders.",
    status: "live",
  },
  {
    slug: "seo-system",
    name: "SEO System",
    image: "/systems/seo-system.svg",
    tagline: "Ongoing optimization that compounds",
    description:
      "Ongoing technical and content SEO that compounds your search rankings over time.",
    status: "live",
  },
  {
    slug: "paid-ads",
    name: "Paid Ads Management",
    image: "/systems/paid-ads.svg",
    tagline: "Google & Meta ads, run and tuned",
    description:
      "Google and Meta ad campaigns built, launched, and optimized against your goals.",
    status: "live",
  },
  {
    slug: "social-media",
    name: "Social Media Management",
    image: "/systems/social-media.svg",
    tagline: "Always-on presence, done for you",
    description:
      "An always-on social presence — content, scheduling, and engagement handled for you.",
    status: "live",
  },
  {
    slug: "loyalty-rewards",
    name: "Loyalty & Rewards",
    image: "/systems/loyalty-rewards.svg",
    tagline: "Keep customers coming back",
    description:
      "A points-and-rewards program that turns one-time buyers into regulars.",
    status: "live",
  },
  {
    slug: "referral-program",
    name: "Referral Program",
    image: "/systems/referral-program.svg",
    tagline: "Turn happy customers into a growth channel",
    description:
      "Turn happy customers into a growth channel with trackable referral rewards.",
    status: "live",
  },
  {
    slug: "analytics-attribution",
    name: "Analytics & Attribution",
    image: "/systems/analytics-attribution.svg",
    tagline: "Know exactly what's working",
    description:
      "Know exactly which channels drive revenue with clear, unified reporting.",
    status: "live",
  },
  {
    slug: "unified-inbox",
    name: "Unified Inbox",
    image: "/systems/unified-inbox.svg",
    tagline: "Email, SMS, social, and chat in one place",
    description:
      "Every customer message — email, SMS, social, and chat — gathered into one shared inbox.",
    status: "live",
  },
  {
    slug: "live-chat",
    name: "Live Chat Widget",
    image: "/systems/live-chat.svg",
    tagline: "Real-time chat on your site",
    description:
      "A real-time chat widget on your site so visitors get answers the moment they ask.",
    status: "live",
  },
  {
    slug: "appointment-reminders",
    name: "Appointment Reminders",
    image: "/systems/appointment-reminders.svg",
    tagline: "Cut no-shows automatically",
    description:
      "Automatic SMS and email reminders that slash no-shows and keep your calendar full.",
    status: "live",
  },
  {
    slug: "phone-system",
    name: "Business Phone System",
    image: "/systems/phone-system.svg",
    tagline: "Modern VoIP with smart routing",
    description:
      "A modern business phone system with smart routing, voicemail, and call tracking.",
    status: "live",
  },
  {
    slug: "mobile-app",
    name: "Mobile App",
    image: "/systems/mobile-app.svg",
    tagline: "iOS & Android, built for your business",
    description:
      "A native iOS and Android app for your business — designed, built, and shipped by Elenos.",
    status: "live",
  },
  {
    slug: "web-app-saas",
    name: "Web App & SaaS",
    image: "/systems/web-app-saas.svg",
    tagline: "Custom software, designed and shipped",
    description:
      "Custom software or a full SaaS product, designed and engineered to your spec.",
    status: "live",
  },
  {
    slug: "custom-ai-integration",
    name: "Custom AI Integration",
    image: "/systems/custom-ai-integration.svg",
    tagline: "Wire AI into your existing systems",
    description:
      "Wire AI into your existing tools and workflows — bespoke models and integrations.",
    status: "live",
  },
];

export const SYSTEM_STATUS: Record<
  SystemStatus,
  { label: string; color: string }
> = {
  live: { label: "Live", color: "var(--color-resolved)" },
  soon: { label: "Coming soon", color: "var(--color-waiting)" },
};
