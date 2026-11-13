"use server";

import { redirect } from "next/navigation";
import { createLoginLink, startSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { getStudentByEmail, seedSampleData, upsertStudentFromEnrollment } from "@/lib/students";
import { site } from "@/lib/site";

export async function requestLoginLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect("/login?error=" + encodeURIComponent("Please enter a valid email."));

  const student = await getStudentByEmail(email);
  let demoLink = "";
  if (student) {
    const link = await createLoginLink(student.id);
    await sendEmail({
      to: email,
      subject: `Your ${site.name} sign-in link`,
      text: `Tap to sign in to ${site.name}: ${link}\n\nThis link expires in 30 minutes and works once.`,
      html: `<p>Tap to sign in to ${site.name}:</p><p><a href="${link}" style="background:#E8B547;color:#10231B;padding:12px 20px;border-radius:10px;font-weight:700;text-decoration:none;display:inline-block">Sign in</a></p><p style="color:#5B6B63;font-size:13px">This link expires in 30 minutes and works once.</p>`,
    }).catch((e) => console.error("[login] email failed", e));
    if (env.paymentMode() === "demo") demoLink = link;
  }
  // Same response whether or not the email exists (no account enumeration) — except the demo shortcut.
  redirect(`/login?sent=1${demoLink ? `&link=${encodeURIComponent(demoLink)}` : ""}`);
}

export async function tryDemoAccount() {
  if (env.paymentMode() !== "demo") redirect("/login");
  const student = await upsertStudentFromEnrollment({
    email: "demo@themoneycircle.ng",
    fullName: "Adaeze Okafor",
    phone: "08030000000",
    offerSlug: "billionaire-circle",
  });
  await seedSampleData(student.id);
  await startSession(student.id);
  redirect("/app");
}
