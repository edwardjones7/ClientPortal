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
];

export const SYSTEM_STATUS: Record<
  SystemStatus,
  { label: string; color: string }
> = {
  live: { label: "Live", color: "var(--color-resolved)" },
  soon: { label: "Coming soon", color: "var(--color-waiting)" },
};
