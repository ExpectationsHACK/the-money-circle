import { addExpense } from "@/app/app/actions";
import { CATEGORIES, today } from "@/lib/money";
import { ActionForm, SubmitButton, input } from "./ui";

export function ExpenseForm({ compact = false }: { compact?: boolean }) {
  return (
    <ActionForm action={addExpense}>
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-[1fr_1.3fr]" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        <label className="text-sm font-semibold">
          Amount
          <input name="amount" inputMode="decimal" required placeholder="₦ 4,500 or 4.5k" className={`mt-1 ${input}`} />
        </label>
        <label className="text-sm font-semibold">
          Category
          <select name="category" required defaultValue="" className={`mt-1 ${input}`}>
            <option value="" disabled>Choose…</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          What for? <span className="font-normal text-muted">(optional)</span>
          <input name="note" maxLength={120} placeholder="Bolt to work" className={`mt-1 ${input}`} />
        </label>
        <label className="text-sm font-semibold">
          Date
          <input name="date" type="date" defaultValue={today()} max={today()} className={`mt-1 ${input}`} />
        </label>
      </div>
      <SubmitButton className="mt-4 w-full sm:w-auto" pendingText="Logging…">Log expense</SubmitButton>
    </ActionForm>
  );
}
