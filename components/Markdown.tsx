import { Fragment, type ReactNode } from "react";

/**
 * A tiny, safe Markdown renderer for lesson content (no HTML passthrough).
 * Supports: ## / ### headings, paragraphs, - and 1. lists, > quotes, **bold**, *italic*, `code`, [links](https://…).
 */

function inline(text: string, key = 0): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}-${i++}`;
    if (t.startsWith("**")) out.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={k} className="rounded bg-cream px-1.5 py-0.5 text-[0.9em]">{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) {
      const label = t.slice(1, t.indexOf("]"));
      const href = m[2];
      out.push(
        <a key={k} href={href} target={href.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className="font-semibold text-moss underline">
          {label}
        </a>,
      );
    } else out.push(<em key={k}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="space-y-4 text-[1.05rem] leading-relaxed text-ink/90">
      {blocks.map((block, bi) => {
        const b = block.trim();
        if (!b) return null;
        if (b.startsWith("### ")) return <h3 key={bi} className="pt-2 font-display text-lg font-bold">{inline(b.slice(4), bi)}</h3>;
        if (b.startsWith("## ")) return <h2 key={bi} className="pt-3 font-display text-xl font-bold">{inline(b.slice(3), bi)}</h2>;
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*[-*] /.test(l)))
          return (
            <ul key={bi} className="list-disc space-y-1.5 pl-6 marker:text-gold">
              {lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*[-*] /, ""), bi * 100 + li)}</li>)}
            </ul>
          );
        if (lines.every((l) => /^\s*\d+[.)] /.test(l)))
          return (
            <ol key={bi} className="list-decimal space-y-1.5 pl-6 marker:font-bold marker:text-moss">
              {lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*\d+[.)] /, ""), bi * 100 + li)}</li>)}
            </ol>
          );
        if (lines.every((l) => l.startsWith(">")))
          return (
            <blockquote key={bi} className="rounded-r-2xl border-l-4 border-gold bg-gold/10 px-5 py-3 font-display text-lg">
              {inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "), bi)}
            </blockquote>
          );
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l, bi * 100 + li)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
