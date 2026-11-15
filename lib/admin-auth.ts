import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";
import { isAdmin } from "./validation";

/** Coach console session: a signed httpOnly cookie, issued after entering ADMIN_SECRET. */

const COOKIE = "tmc_admin";
const HOURS = 12;

function sign(v: string): string {
  return crypto.createHmac("sha256", `admin:${env.adminSecret() ?? ""}`).update(v).digest("base64url");
}

export async function startAdminSession() {
  const exp = Date.now() + HOURS * 3600_000;
  (await cookies()).set(COOKIE, `${exp}.${sign(String(exp))}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });
}

export async function endAdminSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdminSession(): Promise<boolean> {
  if (!env.adminSecret()) return false;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [exp, mac] = raw.split(".");
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  const expected = sign(exp);
  return mac.length === expected.length && crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected));
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdminSession())) redirect("/admin/login");
}

/** API routes accept either the session cookie or an x-admin-secret header (for scripts). */
export async function isAdminRequest(req: Request): Promise<boolean> {
  return isAdmin(req.headers.get("x-admin-secret")) || (await isAdminSession());
}
