/**
 * THE ONBOARDING PIPELINE — replaces the Make.com / Zapier scenario.
 *
 *   Payment confirmed (Paystack webhook, demo checkout, or admin bank-transfer approval)
 *     -> Router by package route (academy | wealth | launchpad | full)
 *     -> 1. Create / upgrade the student's app account
 *     -> 2. Duplicate the matching master Vault in Google Drive, rename, share
 *     -> 3. Community invites (WhatsApp links / single-use Telegram links)
 *     -> 4. Branded acceptance letter (+ booking link + one-tap app sign-in)
 *     -> 5. Ping the coach: "New student payment received!"
 *     -> 6. Mirror the enrollment to the Google Sheet (if configured)
 *
 * Idempotent: the `enrollments` table is keyed by payment reference, so a retried
 * webhook never creates a second vault or sends a second letter.
 */
import { findOffer, type Package } from "./packages";
import { env } from "./env";
import { googleConfigured } from "./google";
import { createClientVault } from "./drive";
import { sendEmail } from "./email";
import { acceptanceLetter, adminNotification, type LetterLink } from "./emails";
import { createSingleUseInvite, notifyAdminTelegram } from "./telegram";
import { appendRow, ledgerConfigured } from "./ledger";
import { now, one, run } from "./db";
import { upsertStudentFromEnrollment } from "./students";
import { createLoginLink } from "./auth";

export interface EnrollmentInput {
  reference: string;
  fullName: string;
  email: string;
  phone: string;
  offerSlug: string;
  amountNaira: number;
  channel: string;
  notes?: string;
}

export interface EnrollmentResult {
  status: "complete" | "skipped" | "partial";
  reference: string;
  studentId?: string;
  vaultUrl?: string;
  bookingUrl?: string;
  issues: string[];
  steps: string[];
}

interface EnrollmentRow {
  reference: string;
  student_id: string | null;
  status: string;
  vault_url: string | null;
  booking_url: string | null;
  updated_at: string;
}

function bookingUrlFor(pkg: Package, fullName: string, email: string): string | undefined {
  const base = pkg.automation.bookingEnv ? env.get(pkg.automation.bookingEnv) : undefined;
  if (!base) return undefined;
  try {
    const u = new URL(base);
    if (u.hostname.includes("calendly.com")) {
      u.searchParams.set("name", fullName);
      u.searchParams.set("email", email);
    }
    return u.toString();
  } catch {
    return base;
  }
}

async function communityLinks(pkg: Package, fullName: string, issues: string[]): Promise<LetterLink[]> {
  const links: LetterLink[] = [];
  for (const c of pkg.automation.communities) {
    const tgChat = c.telegramChatEnv ? env.get(c.telegramChatEnv) : undefined;
    if (tgChat && env.telegramBotToken()) {
      try {
        links.push({ label: c.label, url: await createSingleUseInvite(tgChat, fullName) });
        continue;
      } catch (e) {
        issues.push(`Telegram invite for "${c.label}" failed: ${(e as Error).message}`);
      }
    }
    const url = env.get(c.urlEnv);
    if (url) links.push({ label: c.label, url });
    else issues.push(`No community link configured (${c.urlEnv})`);
  }
  return links;
}

function resourceLinks(pkg: Package): LetterLink[] {
  return (pkg.automation.resources ?? []).map((r) => ({ label: r.label, url: env.get(r.urlEnv) ?? "" })).filter((r) => r.url);
}

export async function enrollStudent(input: EnrollmentInput): Promise<EnrollmentResult> {
  const found = findOffer(input.offerSlug);
  if (!found) throw new Error(`Unknown offer "${input.offerSlug}"`);
  const { pkg, offer } = found;
  const issues: string[] = [];
  const steps: string[] = [];
  const t = now();

  // ---- Idempotency ---------------------------------------------------------------------
  const existing = await one<EnrollmentRow>("SELECT * FROM enrollments WHERE reference = ?", [input.reference]);
  if (existing?.status === "complete") {
    return {
      status: "skipped",
      reference: input.reference,
      studentId: existing.student_id ?? undefined,
      vaultUrl: existing.vault_url ?? undefined,
      bookingUrl: existing.booking_url ?? undefined,
      issues: ["Already enrolled"],
      steps,
    };
  }
  if (existing?.status === "processing" && Date.now() - new Date(existing.updated_at).getTime() < 3 * 60_000) {
    return { status: "skipped", reference: input.reference, issues: ["Another delivery is processing this payment"], steps };
  }
  // Atomic claim: only one concurrent delivery wins the insert/update.
  const claimed = existing
    ? await run("UPDATE enrollments SET status = 'processing', updated_at = ? WHERE reference = ? AND updated_at = ?", [t, input.reference, existing.updated_at])
    : await run(
        `INSERT OR IGNORE INTO enrollments (reference, email, offer_slug, amount_naira, channel, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'processing', ?, ?, ?)`,
        [input.reference, input.email.toLowerCase(), input.offerSlug, input.amountNaira, input.channel, input.notes ?? null, t, t],
      );
  if (!claimed) return { status: "skipped", reference: input.reference, issues: ["Another delivery is processing this payment"], steps };

  // ---- 1. App account --------------------------------------------------------------------
  const bookingUrl = bookingUrlFor(pkg, input.fullName, input.email);
  if (pkg.automation.bookingEnv && !bookingUrl) issues.push(`Booking link not configured (${pkg.automation.bookingEnv})`);
  let student = await upsertStudentFromEnrollment({
    email: input.email,
    fullName: input.fullName,
    phone: input.phone,
    offerSlug: input.offerSlug,
    bookingUrl,
  });
  steps.push("Student app account ready");

  // ---- 2. Drive Vault --------------------------------------------------------------------
  let vaultUrl = existing?.vault_url ?? undefined;
  const templateId = pkg.automation.vaultTemplateEnv ? env.get(pkg.automation.vaultTemplateEnv) : undefined;
  if (pkg.automation.vaultTemplateEnv && !vaultUrl) {
    if (!templateId) issues.push(`Vault template not configured (${pkg.automation.vaultTemplateEnv})`);
    else if (!googleConfigured()) issues.push("Google not configured: vault not created");
    else {
      try {
        const vault = await createClientVault({
          templateFolderId: templateId,
          vaultName: (pkg.automation.vaultName ?? "{name}'s Money Vault").replace("{name}", input.fullName),
          clientName: input.fullName,
          clientEmail: input.email,
          reference: input.reference,
        });
        vaultUrl = vault.url;
        student = await upsertStudentFromEnrollment({ ...input, offerSlug: input.offerSlug, vaultUrl, bookingUrl });
        steps.push(vault.reused ? "Vault already existed (reused)" : `Vault created (${vault.filesCopied} files) and shared`);
      } catch (e) {
        issues.push(`Vault creation failed: ${(e as Error).message}`);
      }
    }
  }

  // ---- 3 + 4. Communities + acceptance letter -----------------------------------------
  const communities = await communityLinks(pkg, input.fullName, issues);
  // Hold the letter if a vault was expected but is missing (except in console/dev mode).
  const vaultMissing = Boolean(pkg.automation.vaultTemplateEnv && !vaultUrl) && env.emailProvider() !== "console" && env.paymentMode() !== "demo";
  let letterSent = false;
  if (!vaultMissing) {
    try {
      const letter = acceptanceLetter({
        fullName: input.fullName,
        pkg,
        offer,
        reference: input.reference,
        vaultUrl,
        bookingUrl,
        appUrl: await createLoginLink(student.id),
        communities,
        resources: resourceLinks(pkg),
      });
      const sent = await sendEmail({ to: input.email, ...letter });
      letterSent = true;
      steps.push(`Acceptance letter sent via ${sent.provider}`);
    } catch (e) {
      issues.push(`Acceptance email failed: ${(e as Error).message}`);
    }
  }
  const complete = letterSent;

  // ---- 5. Notify the coach ---------------------------------------------------------------
  const title = complete ? `New student payment received! ${input.fullName} → ${pkg.name}` : `⚠️ Enrollment needs attention: ${input.fullName}`;
  const adminRows: [string, string][] = [
    ["Name", input.fullName],
    ["Email", input.email],
    ["Phone", input.phone],
    ["Package", `${pkg.name}, ${offer.label}`],
    ["Amount", `₦${input.amountNaira.toLocaleString("en-NG")}`],
    ["Channel", input.channel],
    ["Reference", input.reference],
  ];
  const adminEmail = env.adminEmail();
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      ...adminNotification({ title, rows: adminRows, issues, links: vaultUrl ? [{ label: "Open their Vault", url: vaultUrl }] : [] }),
    })
      .then(() => steps.push("Coach notified by email"))
      .catch((e) => issues.push(`Admin email failed: ${(e as Error).message}`));
  }
  await notifyAdminTelegram(`${title}\n${adminRows.map(([k, v]) => `${k}: ${v}`).join("\n")}`)
    .then((ok) => ok && steps.push("Coach notified on Telegram"))
    .catch((e) => issues.push(`Telegram admin ping failed: ${(e as Error).message}`));

  // ---- 6. Record ------------------------------------------------------------------------
  await run(
    `UPDATE enrollments SET student_id = ?, status = ?, vault_url = ?, booking_url = ?, notes = ?, updated_at = ? WHERE reference = ?`,
    [student.id, complete ? "complete" : "failed", vaultUrl ?? null, bookingUrl ?? null, [input.notes, ...issues].filter(Boolean).join(" | "), now(), input.reference],
  );
  if (ledgerConfigured()) {
    await appendRow({
      reference: input.reference,
      createdAt: t,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      packageName: pkg.name,
      offer: offer.label,
      amountNaira: input.amountNaira,
      channel: input.channel,
      status: complete ? "complete" : "failed",
      vaultUrl,
      bookingUrl,
      notes: issues.join(" | "),
    }).catch((e) => issues.push(`Sheet mirror failed: ${(e as Error).message}`));
  }

  const result: EnrollmentResult = {
    status: complete ? "complete" : "partial",
    reference: input.reference,
    studentId: student.id,
    vaultUrl,
    bookingUrl,
    issues,
    steps,
  };
  if (!complete) {
    const err = new Error(`Enrollment incomplete for ${input.reference}: ${issues.join("; ")}`);
    (err as Error & { result?: EnrollmentResult }).result = result;
    throw err;
  }
  return result;
}

/** Records a "I paid by bank transfer" claim so the coach can verify and approve it. */
export async function recordPendingTransfer(input: Omit<EnrollmentInput, "channel">) {
  const found = findOffer(input.offerSlug);
  if (!found) throw new Error(`Unknown offer "${input.offerSlug}"`);
  const { pkg, offer } = found;
  const t = now();
  await run(
    `INSERT OR IGNORE INTO enrollments (reference, email, offer_slug, amount_naira, channel, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'bank-transfer', 'awaiting-transfer', ?, ?, ?)`,
    [input.reference, input.email.toLowerCase(), input.offerSlug, input.amountNaira, input.notes ?? null, t, t],
  );

  const q = new URLSearchParams({ ref: input.reference, name: input.fullName, email: input.email, phone: input.phone, offer: input.offerSlug });
  const approveUrl = `${env.siteUrl()}/admin?${q.toString()}`;
  const title = `Bank transfer to verify: ${input.fullName} → ${pkg.name}`;
  const rows: [string, string][] = [
    ["Name", input.fullName],
    ["Email", input.email],
    ["Phone", input.phone],
    ["Package", `${pkg.name}, ${offer.label}`],
    ["Expected amount", `₦${input.amountNaira.toLocaleString("en-NG")}`],
    ["Reference", input.reference],
    ["Sender note", input.notes || "—"],
  ];
  const adminEmail = env.adminEmail();
  if (adminEmail) {
    await sendEmail({ to: adminEmail, ...adminNotification({ title, rows, links: [{ label: "Check your bank alert, then approve", url: approveUrl }] }) });
  }
  await notifyAdminTelegram(`${title}\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nApprove: ${approveUrl}`).catch(() => false);
  return { reference: input.reference };
}
