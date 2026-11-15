import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { systemChecks } from "@/lib/system";

/** Reports which integrations are configured (never the values). */
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  return NextResponse.json({ checks: systemChecks() });
}
