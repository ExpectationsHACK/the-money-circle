/**
 * Central, typed access to environment variables.
 * Nothing here throws at import time so the site can build/preview with a
 * partial config. Use `requireEnv` at the point of use for hard requirements.
 */

function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export function requireEnv(name: string): string {
  const v = read(name);
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const env = {
  siteUrl: () => (read("SITE_URL") ?? "http://localhost:3000").replace(/\/$/, ""),

  /** "demo" simulates checkout end-to-end without moving money. */
  paymentMode: (): "demo" | "paystack" =>
    read("PAYMENT_MODE") === "paystack" || (read("PAYMENT_MODE") !== "demo" && read("PAYSTACK_SECRET_KEY")) ? "paystack" : "demo",

  // Paystack
  paystackSecret: () => read("PAYSTACK_SECRET_KEY"),
  paystackPlan: (name: string) => read(name),

  // Google (OAuth refresh-token of the coach's own Google account)
  googleClientId: () => read("GOOGLE_CLIENT_ID"),
  googleClientSecret: () => read("GOOGLE_CLIENT_SECRET"),
  googleRefreshToken: () => read("GOOGLE_REFRESH_TOKEN"),
  vaultsParentFolderId: () => read("VAULTS_PARENT_FOLDER_ID"),
  enrollmentsSheetId: () => read("ENROLLMENTS_SHEET_ID"),
  enrollmentsSheetTab: () => read("ENROLLMENTS_SHEET_TAB") ?? "Enrollments",

  // Email
  emailProvider: () => (read("EMAIL_PROVIDER") ?? "gmail") as "gmail" | "resend" | "console",
  emailFrom: () => read("EMAIL_FROM"),
  emailFromName: () => read("EMAIL_FROM_NAME") ?? "The Money Circle",
  emailReplyTo: () => read("EMAIL_REPLY_TO"),
  resendApiKey: () => read("RESEND_API_KEY"),
  adminEmail: () => read("ADMIN_EMAIL"),

  // Telegram (optional: single-use invite links)
  telegramBotToken: () => read("TELEGRAM_BOT_TOKEN"),
  telegramAdminChatId: () => read("TELEGRAM_ADMIN_CHAT_ID"),

  // Admin
  adminSecret: () => read("ADMIN_SECRET"),

  // Dev helper: also run onboarding from the verified Paystack callback (webhooks can't reach localhost)
  onboardOnCallback: () => read("ONBOARD_ON_CALLBACK") === "true",

  // Generic getter for per-package values (template IDs, links)
  get: (name: string) => read(name),
};
