import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { findOffer } from "@/lib/packages";
import { enrollStudent, type EnrollmentResult } from "@/lib/onboarding";
import { startSession } from "@/lib/auth";
import { firstError, studentSchema } from "@/lib/validation";

const schema = studentSchema.extend({ reference: z.string().regex(/^DEMO-[A-Z0-9-]+$/) });

/** Simulated "payment succeeded" for demo mode. Runs the real onboarding pipeline and signs the student in. */
export async function POST(req: Request) {
  if (env.paymentMode() !== "demo") return NextResponse.json({ error: "Demo payments are disabled" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const d = parsed.data;
  const found = findOffer(d.offer)!;

  let result: EnrollmentResult | undefined;
  try {
    result = await enrollStudent({
      reference: d.reference,
      fullName: d.fullName,
      email: d.email,
      phone: d.phone,
      offerSlug: d.offer,
      amountNaira: found.offer.priceNaira,
      channel: "demo",
    });
  } catch (e) {
    result = (e as Error & { result?: EnrollmentResult }).result;
    console.warn("[demo] onboarding incomplete:", (e as Error).message);
  }
  if (result?.studentId) await startSession(result.studentId);
  return NextResponse.json({ reference: d.reference, redirect: `/enroll/success?reference=${encodeURIComponent(d.reference)}` });
}
