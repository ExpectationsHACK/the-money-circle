export const site = {
  name: "The Money Circle",
  shortName: "TMC",
  coachName: "Your Money Buddy",
  /** Shown in letters and the onboarding kit, e.g. "Sharon". */
  coachFirstName: process.env.NEXT_PUBLIC_COACH_NAME ?? "Sharon",
  coachTitle: "Lead Coach",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  tagline: "Budget it. Track it. Save it. Grow it.",
  description:
    "The Money Circle is a hands-on money coaching ecosystem for Nigerians ready to stop leaking money, build real savings, invest with intention and grow new income streams.",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "", // e.g. 2348012345678
  freeCommunityUrl: process.env.NEXT_PUBLIC_FREE_COMMUNITY_URL ?? "",
};

export function whatsappLink(text: string): string {
  if (!site.whatsappNumber) return "";
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(text)}`;
}
