import crypto from "node:crypto";
import { env, requireEnv } from "./env";

const API = "https://api.paystack.co";

export interface PaystackMetadata {
  offer: string;
  full_name: string;
  phone: string;
  source: "website";
  custom_fields?: { display_name: string; variable_name: string; value: string }[];
}

export interface PaystackTransaction {
  id: number;
  status: "success" | "failed" | "abandoned" | "ongoing" | "pending" | "reversed" | string;
  reference: string;
  amount: number; // kobo
  currency: string;
  paid_at: string | null;
  channel: string;
  metadata: PaystackMetadata | string | null;
  customer: { email: string; first_name: string | null; last_name: string | null; phone: string | null };
  plan?: unknown;
}

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const key = requireEnv("PAYSTACK_SECRET_KEY");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || !json.status) {
    throw new Error(`Paystack ${path} failed (${res.status}): ${json.message ?? "unknown error"}`);
  }
  return json.data as T;
}

export function newReference(prefix = "TMC"): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  metadata: PaystackMetadata;
  planCode?: string;
}) {
  return paystack<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: `${env.siteUrl()}/enroll/success`,
      metadata: input.metadata,
      ...(input.planCode ? { plan: input.planCode } : {}),
    }),
  });
}

export async function verifyTransaction(reference: string) {
  return paystack<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Validates the x-paystack-signature header (HMAC-SHA512 of the raw body with your secret key). */
export function isValidSignature(rawBody: string, signature: string | null): boolean {
  const key = env.paystackSecret();
  if (!key || !signature) return false;
  const hash = crypto.createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(hash);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function parseMetadata(m: PaystackTransaction["metadata"]): Partial<PaystackMetadata> {
  if (!m) return {};
  if (typeof m === "string") {
    try {
      return JSON.parse(m);
    } catch {
      return {};
    }
  }
  return m;
}
