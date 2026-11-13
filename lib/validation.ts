import { z } from "zod";
import crypto from "node:crypto";
import { allOfferSlugs } from "./packages";
import { env } from "./env";

const slugs = allOfferSlugs() as [string, ...string[]];

export const studentSchema = z.object({
  fullName: z.string().trim().min(3, "Please enter your full name").max(80),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s()-]/g, ""))
    .pipe(z.string().regex(/^\+?\d{10,15}$/, "Please enter a valid phone number")),
  offer: z.enum(slugs),
});

export type StudentInput = z.infer<typeof studentSchema>;

export function firstError(e: z.ZodError): string {
  return e.issues[0]?.message ?? "Invalid input";
}

export function isAdmin(provided: string | null | undefined): boolean {
  const secret = env.adminSecret();
  if (!secret || !provided) return false;
  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}
