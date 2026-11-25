import { NextResponse } from "next/server";
import { consumeLoginToken, startSession } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const studentId = await consumeLoginToken(url.searchParams.get("token") ?? "");
  if (!studentId) {
    return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("That link has expired or was already used. Request a new one."), url));
  }
  await startSession(studentId);
  const next = url.searchParams.get("next") ?? "";
  // Only ever redirect inside the student app.
  const safe = /^\/app(\/[\w\-/#?=&.]*)?$/.test(next) && !next.startsWith("//") ? next : "/app";
  return NextResponse.redirect(new URL(safe, url));
}
