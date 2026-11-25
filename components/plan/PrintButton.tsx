"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-xl bg-forest px-5 py-2.5 text-sm font-bold text-cream hover:bg-forest-2 print:hidden">
      🖨 Print / Save as PDF
    </button>
  );
}
