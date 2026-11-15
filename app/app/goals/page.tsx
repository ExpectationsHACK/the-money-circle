import { redirect } from "next/navigation";

/** Goals now live in the Savings tracker. */
export default function GoalsRedirect() {
  redirect("/app/savings");
}
