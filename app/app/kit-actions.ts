"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/auth";
import { markStudent } from "@/lib/onboarding-kit";

export async function markSessionBooked(booked: boolean) {
  const s = await requireStudent();
  await markStudent(s.id, "session_booked_at", booked ? new Date().toISOString() : null);
  revalidatePath("/app", "layout");
}
