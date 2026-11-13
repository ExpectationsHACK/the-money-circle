import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one, run } from "./db";
import { env } from "./env";
import { getStudentById, type Student } from "./students";

/**
 * Passwordless auth: students sign in with a one-time magic link sent to their email.
 * The session is a signed, httpOnly cookie, so no session table is needed.
 */

const COOKIE = "tmc_session";
const SESSION_DAYS = 30;
const LINK_MINUTES = 30;

function secret(): string {
  const s = process.env.AUTH_SECRET?.trim() || env.adminSecret();
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("Set AUTH_SECRET");
  return "tmc-dev-only-secret";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function sha(v: string): string {
  return crypto.createHash("sha256").update(v).digest("hex");
}

export async function startSession(studentId: string) {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  const payload = `${studentId}.${exp}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentStudent(): Promise<Student | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [sid, exp, mac] = parts;
  const expected = sign(`${sid}.${exp}`);
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now()) return null;
  return getStudentById(sid);
}

export async function requireStudent(): Promise<Student> {
  const s = await currentStudent();
  if (!s) redirect("/login");
  return s;
}

export async function createLoginLink(studentId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  await run("INSERT INTO login_tokens (token_hash, student_id, expires_at) VALUES (?, ?, ?)", [
    sha(token),
    studentId,
    Date.now() + LINK_MINUTES * 60_000,
  ]);
  return `${env.siteUrl()}/auth/verify?token=${token}`;
}

/** Consumes a magic-link token. Returns the student id or null. */
export async function consumeLoginToken(token: string): Promise<string | null> {
  const row = await one<{ student_id: string; expires_at: number; used: number }>(
    "SELECT student_id, expires_at, used FROM login_tokens WHERE token_hash = ?",
    [sha(token)],
  );
  if (!row || Number(row.used) || Number(row.expires_at) < Date.now()) return null;
  await run("UPDATE login_tokens SET used = 1 WHERE token_hash = ?", [sha(token)]);
  return row.student_id;
}
