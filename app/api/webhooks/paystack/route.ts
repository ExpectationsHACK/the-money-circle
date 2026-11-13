import { NextResponse } from "next/server";
import { findOffer } from "@/lib/packages";
import { isValidSignature, parseMetadata, type PaystackTransaction } from "@/lib/paystack";
import { enrollStudent } from "@/lib/onboarding";

// Vault copying can take a few seconds per file.
export const maxDuration = 60;

export async function POST(req: Request) {
  const raw = await req.text();
  if (!isValidSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(raw) as { event: string; data: PaystackTransaction };
  if (event.event !== "charge.success") return NextResponse.json({ ignored: event.event });

  const tx = event.data;
  const meta = parseMetadata(tx.metadata);

  // Subscription renewals (and payments not started on this website) carry no offer metadata.
  if (!meta.offer) return NextResponse.json({ ignored: "no offer metadata (likely a renewal)" });

  const found = findOffer(meta.offer);
  if (!found) return NextResponse.json({ ignored: `unknown offer ${meta.offer}` });

  if (tx.currency !== "NGN" || tx.amount < found.offer.priceNaira * 100) {
    console.error(`[webhook] amount mismatch for ${tx.reference}: got ${tx.amount} ${tx.currency}`);
    return NextResponse.json({ ignored: "amount mismatch" });
  }

  try {
    const result = await enrollStudent({
      reference: tx.reference,
      fullName:
        meta.full_name || [tx.customer.first_name, tx.customer.last_name].filter(Boolean).join(" ") || tx.customer.email,
      email: tx.customer.email,
      phone: meta.phone || tx.customer.phone || "",
      offerSlug: meta.offer,
      amountNaira: tx.amount / 100,
      channel: `paystack:${tx.channel}`,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[webhook] onboarding failed", e);
    // Non-2xx makes Paystack retry later; completed steps are skipped on retry.
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
