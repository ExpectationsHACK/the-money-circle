"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/app/actions";

export const input =
  "block w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-base outline-none transition placeholder:text-muted/60 focus:border-forest focus:ring-2 focus:ring-forest/15";

export function SubmitButton({
  children,
  pendingText = "Saving…",
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "dark" | "ghost" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-gold text-ink hover:bg-gold-soft",
    dark: "bg-forest text-cream hover:bg-forest-2",
    ghost: "text-muted hover:bg-cream hover:text-ink",
    danger: "text-muted hover:bg-coral/10 hover:text-coral",
  }[variant];
  return (
    <button
      disabled={pending}
      className={`rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60 ${styles} ${className}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}

/** A form bound to a server action that returns { ok | error }, with inline feedback and auto-reset on success. */
export function ActionForm({
  action,
  children,
  className = "",
  resetOnSuccess = true,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error && (
        <p role="alert" className="mt-2 text-sm font-medium text-coral">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="mt-2 text-sm font-medium text-moss">
          {state.ok}
        </p>
      )}
    </form>
  );
}

export function ConfirmButton({ children, message, className = "" }: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function Bar({ value, tone = "forest" }: { value: number; tone?: "forest" | "gold" | "coral" }) {
  const color = { forest: "bg-moss", gold: "bg-gold", coral: "bg-coral" }[tone];
  return (
    <div className="h-2 overflow-hidden rounded-full bg-cream" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Locked({ title, pillarName, body }: { title: string; pillarName: string; body: string }) {
  return (
    <div className="grain rounded-3xl bg-forest p-8 text-cream sm:p-10">
      <span className="grid size-12 place-items-center rounded-full bg-gold/15 text-2xl" aria-hidden>
        🔒
      </span>
      <h1 className="mt-5 font-display text-3xl font-bold">{title}</h1>
      <p className="mt-2 max-w-lg text-cream/75">{body}</p>
      <p className="mt-1 text-sm text-gold">Part of {pillarName}.</p>
      <Link href="/#packages" className="mt-6 inline-block rounded-2xl bg-gold px-6 py-3 font-bold text-ink hover:bg-gold-soft">
        See upgrade options
      </Link>
    </div>
  );
}
