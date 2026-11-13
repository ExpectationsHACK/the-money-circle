import { NextResponse } from "next/server";
import { z } from "zod";
import { findOffer } from "@/lib/packages";
import { newReference } from "@/lib/paystack";
import { enrollStudent, type EnrollmentResult } from "@/lib/onboarding";
import { firstError, isAdmin, studentSchema } from "@/lib/validation";

export const maxDuration = 60;

const schema = studentSchema.extend({
  reference: z.string().trim().max(60).optional(),
  amountNaira: z.coerce.number().nonnegative().optional(),
  note: z.string().trim().max(300).optional(),
});

/** Manual approval (bank transfer, cash, comp seats). Runs the exact same pipeline as Paystack. */
export async function POST(req: Request) {
  if (!isAdmin(req.headers.get("x-admin-secret"))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const d = parsed.data;
  const found = findOffer(d.offer)!;
  try {
    const result = await enrollStudent({
      reference: d.reference || newReference("BT"),
      fullName: d.fullName,
      email: d.email,
      phone: d.phone,
      offerSlug: d.offer,
      amountNaira: d.amountNaira ?? found.offer.priceNaira,
      channel: "bank-transfer (manual approval)",
      notes: d.note,
    });
    return NextResponse.json(result);
  } catch (e) {
    const result = (e as Error & { result?: EnrollmentResult }).result;
    return NextResponse.json({ error: (e as Error).message, ...(result ?? {}) }, { status: 500 });
  }
}
