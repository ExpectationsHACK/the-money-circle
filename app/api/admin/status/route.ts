import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { googleConfigured } from "@/lib/google";
import { PACKAGES } from "@/lib/packages";
import { isAdmin } from "@/lib/validation";

/** Reports which integrations are configured (never the values). */
export async function GET(req: Request) {
  if (!isAdmin(req.headers.get("x-admin-secret"))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const has = (name?: string) => Boolean(name && env.get(name));
  const checks: { area: string; item: string; ok: boolean; optional?: boolean }[] = [
    { area: "Core", item: "SITE_URL", ok: has("SITE_URL") },
    { area: "Payments", item: "Paystack secret key", ok: Boolean(env.paystackSecret()) },
    { area: "Google", item: "Google OAuth (Drive, Gmail, Sheets)", ok: googleConfigured() },
    { area: "Google", item: "Enrollments sheet", ok: Boolean(env.enrollmentsSheetId()) },
    { area: "Google", item: "Vaults parent folder", ok: Boolean(env.vaultsParentFolderId()), optional: true },
    {
      area: "Email",
      item: `Email provider: ${env.emailProvider()}`,
      ok: env.emailProvider() !== "console" && Boolean(env.emailFrom()),
    },
    { area: "Email", item: "Admin notification address", ok: Boolean(env.adminEmail()) },
    { area: "Telegram", item: "Bot token", ok: Boolean(env.telegramBotToken()), optional: true },
  ];
  for (const p of PACKAGES) {
    const a = p.automation;
    if (a.vaultTemplateEnv) checks.push({ area: p.name, item: `Vault template (${a.vaultTemplateEnv})`, ok: has(a.vaultTemplateEnv) });
    if (a.bookingEnv) checks.push({ area: p.name, item: `Booking link (${a.bookingEnv})`, ok: has(a.bookingEnv) });
    for (const c of a.communities)
      checks.push({ area: p.name, item: `${c.label} (${c.urlEnv})`, ok: has(c.urlEnv) || has(c.telegramChatEnv) });
    for (const o of p.offers)
      if (o.paystackPlanEnv)
        checks.push({ area: p.name, item: `Paystack plan: ${o.label} (${o.paystackPlanEnv})`, ok: has(o.paystackPlanEnv), optional: true });
  }
  return NextResponse.json({ checks });
}
