"use client";

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Toasts — fire from anywhere with toast("…"), rendered by <Toaster/> in the app layout.
// ---------------------------------------------------------------------------

type ToastTone = "ok" | "error";
export function toast(message: string, tone: ToastTone = "ok") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("tmc-toast", { detail: { message, tone } }));
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; message: string; tone: ToastTone }[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const { message, tone } = (e as CustomEvent).detail as { message: string; tone: ToastTone };
      const tid = Date.now() + Math.random();
      setItems((x) => [...x.slice(-2), { id: tid, message, tone }]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== tid)), tone === "error" ? 5000 : 2500);
    };
    window.addEventListener("tmc-toast", on);
    return () => window.removeEventListener("tmc-toast", on);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={`pointer-events-auto rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg ${t.tone === "error" ? "bg-coral text-white" : "bg-ink text-cream"}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline-editable cells (Notion-style): looks like text, click to edit,
// Enter/blur saves, Esc cancels, failed saves roll back with a toast.
// ---------------------------------------------------------------------------

type SaveFn = (value: string) => Promise<{ ok: boolean; error?: string } | void>;

const cellBase = "w-full rounded-lg px-2 py-1.5 text-left outline-none transition";
const idle = "hover:bg-cream focus-visible:bg-cream focus-visible:ring-2 focus-visible:ring-forest/30";
const editing = "bg-paper ring-2 ring-forest/40";

async function runSave(save: SaveFn, value: string): Promise<boolean> {
  try {
    const r = await save(value);
    if (r && !r.ok) {
      toast(r.error ?? "Couldn’t save", "error");
      return false;
    }
    return true;
  } catch (e) {
    toast((e as Error).message || "Couldn’t save", "error");
    return false;
  }
}

export function TextCell({
  value,
  onSave,
  placeholder = "Empty",
  className = "",
  display,
  ariaLabel,
  inputMode,
  align = "left",
}: {
  value: string;
  onSave: SaveFn;
  placeholder?: string;
  className?: string;
  display?: React.ReactNode;
  ariaLabel: string;
  inputMode?: "text" | "decimal";
  align?: "left" | "right";
}) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!edit) setDraft(value);
  }, [value, edit]);
  useEffect(() => {
    if (edit) ref.current?.select();
  }, [edit]);

  const committing = useRef(false);
  async function commit() {
    if (committing.current) return; // Enter + the blur that follows must save once
    committing.current = true;
    setEdit(false);
    if (draft.trim() === value.trim()) {
      committing.current = false;
      return;
    }
    setBusy(true);
    const good = await runSave(onSave, draft);
    setBusy(false);
    committing.current = false;
    if (!good) setDraft(value);
  }

  if (edit)
    return (
      <input
        ref={ref}
        autoFocus
        value={draft}
        inputMode={inputMode}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEdit(false);
          }
        }}
        className={`${cellBase} ${editing} ${align === "right" ? "text-right tabular-nums" : ""} ${className}`}
      />
    );
  return (
    <button
      type="button"
      onClick={() => setEdit(true)}
      aria-label={`${ariaLabel}: ${value || "empty"}. Click to edit`}
      className={`${cellBase} ${idle} ${align === "right" ? "text-right tabular-nums" : ""} ${busy ? "opacity-50" : ""} ${className}`}
    >
      {display ?? (value ? value : <span className="text-muted/60">{placeholder}</span>)}
    </button>
  );
}

export function SelectCell({
  value,
  options,
  onSave,
  ariaLabel,
  display,
  className = "",
}: {
  value: string;
  options: { value: string; label: string }[];
  onSave: SaveFn;
  ariaLabel: string;
  display?: React.ReactNode;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">{ariaLabel}</span>
      <span className={`${cellBase} ${idle} pointer-events-none block truncate ${busy ? "opacity-50" : ""}`}>
        {display ?? options.find((o) => o.value === value)?.label ?? value}
      </span>
      <select
        value={value}
        disabled={busy}
        onChange={async (e) => {
          setBusy(true);
          await runSave(onSave, e.target.value);
          setBusy(false);
        }}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function DateCell({ value, onSave, ariaLabel, max }: { value: string; onSave: SaveFn; ariaLabel: string; max?: string }) {
  const [busy, setBusy] = useState(false);
  const label = new Date(value + "T00:00:00").toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  return (
    <label className="relative block">
      <span className="sr-only">{ariaLabel}</span>
      <span className={`${cellBase} ${idle} pointer-events-none block whitespace-nowrap text-muted ${busy ? "opacity-50" : ""}`}>{label}</span>
      <input
        type="date"
        value={value}
        max={max}
        disabled={busy}
        onChange={async (e) => {
          if (!e.target.value) return;
          setBusy(true);
          await runSave(onSave, e.target.value);
          setBusy(false);
        }}
        className="absolute inset-0 size-full cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:size-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
      />
    </label>
  );
}

/** Thin single-hue progress bar with an over-budget state. */
export function Meter({ value, max, over }: { value: number; max: number; over?: boolean }) {
  const pctV = max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-cream" role="progressbar" aria-valuenow={Math.round(pctV)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all ${over ? "bg-coral" : "bg-moss"}`} style={{ width: `${pctV}%` }} />
    </div>
  );
}

export const fmt = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
export const fmtCompact = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m` : Math.abs(n) >= 10_000 ? `₦${Math.round(n / 1000)}k` : fmt(n);
