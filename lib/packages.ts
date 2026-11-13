/**
 * THE MONEY CIRCLE — PRODUCT & PACKAGING ARCHITECTURE
 *
 * This is the single source of truth for every tier, price and automation route.
 * Edit prices, copy and inclusions here; the website, checkout and onboarding
 * pipeline all read from this file.
 *
 * Prices are in Naira. Paystack charges in kobo (×100) — handled in lib/paystack.ts.
 */

export type Route = "academy" | "wealth" | "launchpad" | "full";
export type Billing = "one-time" | "monthly" | "annual";
export type Pillar = 1 | 2 | 3 | 4;

export interface Offer {
  /** URL slug used at /enroll/[slug] and stored in Paystack metadata */
  slug: string;
  label: string;
  priceNaira: number;
  billing: Billing;
  /** Optional env var holding a Paystack Plan code (makes the charge a recurring subscription) */
  paystackPlanEnv?: string;
  note?: string;
}

export interface Package {
  id: string;
  route: Route;
  name: string;
  intent: "Learn" | "Organize + Build" | "Earn" | "Everything";
  pillars: Pillar[];
  headline: string;
  positioning: string;
  target: string;
  includes: string[];
  delivery: string;
  duration: string;
  offers: Offer[];
  featured?: boolean;
  vip?: boolean;
  /** Automation wiring (env var NAMES, values live in .env) */
  automation: {
    /** Google Drive folder ID of the master template to duplicate (omit = no vault) */
    vaultTemplateEnv?: string;
    /** Name of the client's copy. {name} is replaced with the client's full name */
    vaultName?: string;
    vaultLabel?: string;
    /** Booking link env var (Calendly etc.) */
    bookingEnv?: string;
    bookingLabel: string;
    /** Community invite links (WhatsApp/Telegram URL env vars) included in the email */
    communities: { label: string; urlEnv: string; telegramChatEnv?: string }[];
    /** Extra resource links for the email */
    resources?: { label: string; urlEnv: string }[];
  };
}

export const PILLARS: Record<Pillar, { name: string; short: string; blurb: string }> = {
  1: { name: "TMC Academy", short: "Learn", blurb: "Community, money therapy & on-demand masterclasses." },
  2: { name: "Financial Planner", short: "Organize", blurb: "Budgeting, expense tracking & monthly 1-on-1 Money Dates." },
  3: { name: "Wealth Builder", short: "Invest & Save", blurb: "PiggyVest targets, portfolio setup & long-term wealth strategy." },
  4: { name: "LaunchPad", short: "Earn", blurb: "Skill-to-business incubation & 30-day high-income skill sprints." },
};

export const PACKAGES: Package[] = [
  {
    id: "academy",
    route: "academy",
    name: "Academy Pass",
    intent: "Learn",
    pillars: [1],
    headline: "Learn & Heala",
    positioning: "Fix your relationship with money and master the basics.",
    target:
      "You feel overwhelmed, stressed or stuck in bad money habits and you need mindset rewiring, money therapy and solid foundations.",
    includes: [
      "Access to the Money Circle community",
      "Monthly live Money Therapy & Q&A group calls",
      "Full vault of on-demand masterclasses: Budgeting 101, Debt Relief, Money Mindset Rewiring",
    ],
    delivery: "Group-based & on-demand",
    duration: "Monthly / Annual",
    offers: [
      { slug: "academy-monthly", label: "Monthly", priceNaira: 10000, billing: "monthly", paystackPlanEnv: "PAYSTACK_PLAN_ACADEMY_MONTHLY" },
      { slug: "academy-annual", label: "Annual", priceNaira: 100000, billing: "annual", paystackPlanEnv: "PAYSTACK_PLAN_ACADEMY_ANNUAL", note: "2 months free" },
    ],
    automation: {
      bookingEnv: "ACADEMY_CALLS_URL",
      bookingLabel: "See the Money Therapy call schedule",
      communities: [{ label: "Join the Academy community", urlEnv: "COMMUNITY_ACADEMY_URL", telegramChatEnv: "TELEGRAM_CHAT_ACADEMY" }],
      resources: [{ label: "Open the Masterclass vault", urlEnv: "ACADEMY_PORTAL_URL" }],
    },
  },
  {
    id: "wealth",
    route: "wealth",
    name: "Foundation & Wealth",
    intent: "Organize + Build",
    pillars: [1, 2, 3],
    headline: "Stop leaking. Start building.",
    positioning:
      "Stop leaking money. Build structure, save target funds, and deploy your capital to invest long-term.",
    target:
      "You're already earning, as a professional or business owner, but you spend reactively, have zero long-term savings, or want to start investing seriously.",
    includes: [
      "Monthly 1-on-1 Money Dates with your coach",
      "Personalised Budget & Expense Tracker set up in your private Money Vault",
      "PiggyVest savings-target setup",
      "Hands-on portfolio build: mutual funds, stocks, treasury bills, money market",
      "FREE full access to every Academy workshop & Money Therapy session",
    ],
    delivery: "1-on-1 coaching + your custom Vault",
    duration: "6 months",
    featured: true,
    offers: [{ slug: "foundation-wealth", label: "6-month programme", priceNaira: 100000, billing: "one-time" }],
    automation: {
      vaultTemplateEnv: "VAULT_TEMPLATE_WEALTH_ID",
      vaultName: "{name}'s Money Vault",
      vaultLabel: "Open your Money Vault",
      bookingEnv: "BOOKING_WEALTH_URL",
      bookingLabel: "Book your first Money Date",
      communities: [
        { label: "Join the Wealth & Planning circle", urlEnv: "COMMUNITY_WEALTH_URL", telegramChatEnv: "TELEGRAM_CHAT_WEALTH" },
        { label: "Join the Academy community", urlEnv: "COMMUNITY_ACADEMY_URL", telegramChatEnv: "TELEGRAM_CHAT_ACADEMY" },
      ],
      resources: [{ label: "Open the Masterclass vault", urlEnv: "ACADEMY_PORTAL_URL" }],
    },
  },
  {
    id: "launchpad",
    route: "launchpad",
    name: "LaunchPad",
    intent: "Earn",
    pillars: [4],
    headline: "Turn skills into income",
    positioning: "Turn your skills into real income, or learn a high-income skill in a 30-day execution sprint.",
    target: "You specifically want to grow your primary income or build a second income stream.",
    includes: [
      "Option A, The Incubator: 1-on-1 idea-to-execution coaching to launch a service, consulting or product business",
      "Ruthless accountability until your first sale or client",
      "Option B, Skill Sprint: a 1-month intensive cohort on one high-income skill (e.g. Social Media Management, Video Editing)",
      "Business Execution & Project Tracker in your LaunchPad Vault",
    ],
    delivery: "1-on-1 incubation or cohort sprint",
    duration: "1 to 3 months",
    offers: [
      { slug: "launchpad-incubator", label: "Incubator (1-on-1)", priceNaira: 150000, billing: "one-time", note: "Up to 3 months" },
      { slug: "launchpad-sprint", label: "Skill Sprint (cohort)", priceNaira: 50000, billing: "one-time", note: "30 days" },
    ],
    automation: {
      vaultTemplateEnv: "VAULT_TEMPLATE_LAUNCHPAD_ID",
      vaultName: "{name}'s LaunchPad Vault",
      vaultLabel: "Open your LaunchPad Vault",
      bookingEnv: "BOOKING_LAUNCHPAD_URL",
      bookingLabel: "Book your LaunchPad kickoff",
      communities: [{ label: "Join LaunchPad Founders", urlEnv: "COMMUNITY_LAUNCHPAD_URL", telegramChatEnv: "TELEGRAM_CHAT_LAUNCHPAD" }],
    },
  },
  {
    id: "billionaire",
    route: "full",
    name: "The Billionaire Circle",
    intent: "Everything",
    pillars: [1, 2, 3, 4],
    headline: "The full 360",
    positioning: "The ultimate 6-month hands-on transformation for your financial life.",
    target:
      "You're a serious builder and you want it all: organise current income, set up investments, and actively launch a new income stream.",
    includes: [
      "Complete 1-on-1 Financial Planning (Pillar 2)",
      "Complete Wealth Building & Portfolio Strategy (Pillar 3)",
      "Full LaunchPad business coaching or Sprint enrolment (Pillar 4)",
      "Unlimited Academy & Money Therapy access (Pillar 1)",
      "Priority onboarding and the VIP Billionaire Circle community",
    ],
    delivery: "All-access 1-on-1 + every community",
    duration: "6 months",
    vip: true,
    offers: [{ slug: "billionaire-circle", label: "6-month all-access", priceNaira: 250000, billing: "one-time" }],
    automation: {
      vaultTemplateEnv: "VAULT_TEMPLATE_FULL_ID",
      vaultName: "{name}'s Money Vault",
      vaultLabel: "Open your Complete Vault",
      bookingEnv: "BOOKING_VIP_URL",
      bookingLabel: "Book your priority onboarding",
      communities: [
        { label: "Enter the Billionaire Circle (VIP)", urlEnv: "COMMUNITY_VIP_URL", telegramChatEnv: "TELEGRAM_CHAT_VIP" },
        { label: "Join LaunchPad Founders", urlEnv: "COMMUNITY_LAUNCHPAD_URL", telegramChatEnv: "TELEGRAM_CHAT_LAUNCHPAD" },
        { label: "Join the Wealth & Planning circle", urlEnv: "COMMUNITY_WEALTH_URL", telegramChatEnv: "TELEGRAM_CHAT_WEALTH" },
      ],
      resources: [{ label: "Open the Masterclass vault", urlEnv: "ACADEMY_PORTAL_URL" }],
    },
  },
];

/** Website comparison table rows */
export const COMPARISON: { feature: string; values: Record<string, string> }[] = [
  { feature: "Pillars covered", values: { academy: "Pillar 1", wealth: "Pillars 1 + 2 + 3", launchpad: "Pillar 4", billionaire: "Pillars 1–4" } },
  { feature: "Money Therapy & workshops", values: { academy: "yes", wealth: "yes", launchpad: "—", billionaire: "yes" } },
  { feature: "Personalised Money Vault", values: { academy: "—", wealth: "yes", launchpad: "Business tracker only", billionaire: "Full vault" } },
  { feature: "1-on-1 monthly Money Dates", values: { academy: "—", wealth: "yes", launchpad: "—", billionaire: "yes" } },
  { feature: "Investment portfolio setup", values: { academy: "—", wealth: "yes", launchpad: "—", billionaire: "yes" } },
  { feature: "LaunchPad coaching / Sprint", values: { academy: "—", wealth: "—", launchpad: "yes", billionaire: "yes" } },
  { feature: "Duration", values: { academy: "Monthly / Annual", wealth: "6 months", launchpad: "1–3 months", billionaire: "6 months" } },
];

export function findOffer(slug: string): { pkg: Package; offer: Offer } | null {
  for (const pkg of PACKAGES) {
    const offer = pkg.offers.find((o) => o.slug === slug);
    if (offer) return { pkg, offer };
  }
  return null;
}

export function allOfferSlugs(): string[] {
  return PACKAGES.flatMap((p) => p.offers.map((o) => o.slug));
}

export function formatNaira(n: number): string {
  return "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

export function billingSuffix(b: Billing): string {
  return b === "monthly" ? "/month" : b === "annual" ? "/year" : "";
}

export function startingPrice(pkg: Package): number {
  return Math.min(...pkg.offers.map((o) => o.priceNaira));
}
