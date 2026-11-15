import { env } from "./env";
import { googleConfigured } from "./google";
import { PACKAGES } from "./packages";

export interface Check {
  area: string;
  item: string;
  ok: boolean;
  optional?: boolean;
}

/** Which integrations are configured (never exposes values). */
export function systemChecks(): Check[] {
  const has = (name?: string) => Boolean(name && env.get(name));
  const live = env.paymentMode() === "paystack";
  const checks: Check[] = [
    { area: "Core", item: "SITE_URL", ok: has("SITE_URL") },
    { area: "Core", item: "AUTH_SECRET (student logins)", ok: has("AUTH_SECRET"), optional: process.env.NODE_ENV !== "production" },
    { area: "Core", item: "Database (DATABASE_URL, needed in production)", ok: has("DATABASE_URL"), optional: true },
    { area: "Payments", item: `Payment mode: ${env.paymentMode()}`, ok: live },
    { area: "Payments", item: "Paystack secret key", ok: Boolean(env.paystackSecret()), optional: !live },
    { area: "Google", item: "Google OAuth (Drive, Gmail, Sheets)", ok: googleConfigured() },
    { area: "Google", item: "Enrollments sheet mirror", ok: Boolean(env.enrollmentsSheetId()), optional: true },
    { area: "Google", item: "Vaults parent folder", ok: Boolean(env.vaultsParentFolderId()), optional: true },
    { area: "Email", item: `Email provider: ${env.emailProvider()}`, ok: env.emailProvider() !== "console" && Boolean(env.emailFrom()) },
    { area: "Email", item: "Admin notification address", ok: Boolean(env.adminEmail()) },
    { area: "Telegram", item: "Bot token", ok: Boolean(env.telegramBotToken()), optional: true },
  ];
  for (const p of PACKAGES) {
    const a = p.automation;
    if (a.vaultTemplateEnv) checks.push({ area: p.name, item: `Vault template (${a.vaultTemplateEnv})`, ok: has(a.vaultTemplateEnv) });
    if (a.bookingEnv) checks.push({ area: p.name, item: `Booking link (${a.bookingEnv})`, ok: has(a.bookingEnv) });
    for (const c of a.communities) checks.push({ area: p.name, item: `${c.label} (${c.urlEnv})`, ok: has(c.urlEnv) || has(c.telegramChatEnv) });
    for (const o of p.offers)
      if (o.paystackPlanEnv) checks.push({ area: p.name, item: `Paystack plan: ${o.label} (${o.paystackPlanEnv})`, ok: has(o.paystackPlanEnv), optional: true });
  }
  return checks;
}
