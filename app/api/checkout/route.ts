import { NextResponse } from "next/server";
import { findOffer } from "@/lib/packages";
import { env } from "@/lib/env";
import { initializeTransaction, newReference } from "@/lib/paystack";
import { firstError, studentSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const parsed = studentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: firstError(parsed.error) }, { status: 400 });
  const { fullName, email, phone, offer: slug } = parsed.data;

  const found = findOffer(slug)!;
  if (env.paymentMode() === "demo") {
    // No money moves: the browser shows a simulated payment sheet, then calls /api/demo/complete.
    return NextResponse.json({ demo: true, reference: newReference("DEMO"), amountNaira: found.offer.priceNaira, email, fullName });
  }
  if (!env.paystackSecret()) {
    return NextResponse.json({ error: "Online payment is not set up yet. Please use bank transfer." }, { status: 503 });
  }

  const reference = newReference();
  const planCode = found.offer.paystackPlanEnv ? env.paystackPlan(found.offer.paystackPlanEnv) : undefined;

  try {
    const tx = await initializeTransaction({
      email,
      amountKobo: found.offer.priceNaira * 100, // price always comes from the server, never the browser
      reference,
      planCode,
      metadata: {
        offer: slug,
        full_name: fullName,
        phone,
        source: "website",
        custom_fields: [
          { display_name: "Full name", variable_name: "full_name", value: fullName },
          { display_name: "Phone", variable_name: "phone", value: phone },
          { display_name: "Package", variable_name: "package", value: `${found.pkg.name} (${found.offer.label})` },
        ],
      },
    });
    return NextResponse.json({ accessCode: tx.access_code, authorizationUrl: tx.authorization_url, reference: tx.reference });
  } catch (e) {
    console.error("[checkout]", e);
    return NextResponse.json({ error: "We could not start your payment. Please try again in a moment." }, { status: 502 });
  }
}
