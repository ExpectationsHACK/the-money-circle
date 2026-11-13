import { NextResponse } from "next/server";
import { z } from "zod";
import { findOffer } from "@/lib/packages";
import { newReference } from "@/lib/paystack";
import { recordPendingTransfer } from "@/lib/onboarding";
import { firstError, studentSchema } from "@/lib/validation";

const schema = studentSchema.extend({ note: z.string().trim().max(300).optional() });

/** Student says "I've paid by transfer". The coach gets an approve link; nothing is unlocked until approved. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const d = parsed.data;
  const found = findOffer(d.offer)!;
  const reference = newReference("BT");
  try {
    await recordPendingTransfer({
      reference,
      fullName: d.fullName,
      email: d.email,
      phone: d.phone,
      offerSlug: d.offer,
      amountNaira: found.offer.priceNaira,
      notes: d.note,
    });
    return NextResponse.json({ reference });
  } catch (e) {
    console.error("[bank-transfer]", e);
    return NextResponse.json({ error: "We could not record your transfer. Please message us on WhatsApp." }, { status: 500 });
  }
}
