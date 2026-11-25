import type { Package, Offer } from "./packages";
import { formatNaira, billingSuffix } from "./packages";
import { site } from "./site";

export interface LetterLink {
  label: string;
  url: string;
}

export interface AcceptanceData {
  fullName: string;
  pkg: Package;
  offer: Offer;
  reference: string;
  /** One-tap sign-in that lands on the onboarding kit. */
  appUrl?: string;
  siteUrl: string;
  /** Google Drive copy of the vault, when one was created. */
  vaultUrl?: string;
  bookingUrl?: string;
  planRequired: boolean;
  agenda: string[];
  communities: LetterLink[];
  resources: LetterLink[];
  whatsappUrl?: string;
}

const C = {
  ink: "#10231B",
  green: "#0F3D2E",
  gold: "#E8B547",
  cream: "#FBF6EA",
  muted: "#5B6B63",
  line: "#E6DFCC",
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

function button(link: LetterLink, primary: boolean): string {
  const bg = primary ? C.gold : C.green;
  const fg = primary ? C.ink : "#FFFFFF";
  return `<tr><td style="padding:6px 0">
    <a href="${esc(link.url)}" style="display:block;background:${bg};color:${fg};text-decoration:none;font-weight:700;font-size:15px;padding:14px 20px;border-radius:12px;text-align:center">${esc(link.label)} &rarr;</a>
  </td></tr>`;
}

function shell(inner: string, preheader: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(site.name)}</title></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:Helvetica,Arial,sans-serif;color:${C.ink}">
<div style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid ${C.line}">
${inner}
<tr><td style="padding:20px 32px 28px;border-top:1px solid ${C.line};font-size:12px;color:${C.muted};line-height:1.6">
${esc(site.name)} · ${esc(site.tagline)}<br>You're receiving this because you enrolled at ${esc(site.name)}. Reply to this email any time, a real human reads it.
</td></tr>
</table></td></tr></table></body></html>`;
}

/** Kit item block: number badge, title, body, and buttons. */
function kitItem(n: number, title: string, body: string, links: LetterLink[]): string {
  return `<tr><td style="padding:10px 32px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:16px"><tr>
    <td style="width:44px;padding:16px 0 16px 16px;vertical-align:top"><div style="width:32px;height:32px;border-radius:16px;background:${C.gold};color:${C.ink};font-weight:800;text-align:center;line-height:32px">${n}</div></td>
    <td style="padding:16px 18px 16px 12px;font-size:15px;line-height:1.6">
      <div style="font-weight:800;font-size:16px">${title}</div>
      <div style="color:${C.muted};margin-top:4px">${body}</div>
      ${links
        .map(
          (l, i) =>
            `<a href="${esc(l.url)}" style="display:inline-block;margin:10px 8px 0 0;background:${i === 0 ? C.green : "#FFFFFF"};color:${i === 0 ? "#FFFFFF" : C.green};border:1px solid ${C.green};text-decoration:none;font-weight:700;font-size:14px;padding:10px 16px;border-radius:10px">${esc(l.label)} &rarr;</a>`,
        )
        .join("")}
    </td>
  </tr></table>
</td></tr>`;
}

/** The official welcome letter, written in the coach's voice. */
export function acceptanceLetter(d: AcceptanceData): { subject: string; html: string; text: string } {
  const name = firstName(d.fullName);
  const coach = `${site.coachFirstName} (${site.coachName})`;
  const vip = Boolean(d.pkg.vip);
  const subject = `${name}, welcome to The Money Circle 🎉 Your onboarding kit is inside`;
  const kitUrl = d.appUrl ?? `${d.siteUrl}/app/welcome`;
  const lower = (x: string) => x[0].toLowerCase() + x.slice(1);
  const agendaText = d.agenda.length > 1 ? `${d.agenda.slice(0, -1).map(lower).join(", ")} and ${lower(d.agenda[d.agenda.length - 1])}` : d.agenda.map(lower).join("");
  const siteHost = d.siteUrl.replace(/^https?:\/\//, "");

  type Item = { title: string; body: string; links: LetterLink[] };
  const items: Item[] = [];
  items.push({
    title: "Your personal vault",
    body:
      "Your personal vault contains your financial tools" +
      (d.planRequired ? ": your financial plan, money tracker, savings goals" : "") +
      (d.pkg.pillars.includes(4) ? " and LaunchPad project tracker" : "") +
      ".",
    links: [{ label: "Open my vault", url: `${d.siteUrl}/app/vault` }, ...(d.vaultUrl ? [{ label: "Google Drive copy", url: d.vaultUrl }] : [])],
  });
  if (d.planRequired)
    items.push({
      title: "Fill out your financial plan",
      body: "Kindly ensure you fill out your financial plan <strong>before</strong> your next session. It takes about 20 minutes and saves as you go.",
      links: [{ label: "Start my financial plan", url: `${d.siteUrl}/app/plan` }],
    });
  if (d.bookingUrl)
    items.push({
      title: "Book your next session",
      body: `Book your next session with this link. Our next session will be to ${esc(agendaText)}.`,
      links: [{ label: "Book my session", url: d.bookingUrl }],
    });
  if (d.communities.length) items.push({ title: "Join your circle", body: "Say hi, introduce yourself, and tell us your #1 money goal.", links: d.communities });
  if (d.resources.length) items.push({ title: "Start learning", body: "Budgeting 101 is a perfect first watch.", links: d.resources });

  const price = `${formatNaira(d.offer.priceNaira)}${billingSuffix(d.offer.billing)}`;
  const inner = `
<tr><td style="background:${C.green};padding:32px;color:#FFFFFF">
  <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.gold};font-weight:700">${vip ? "VIP · " : ""}Official welcome</div>
  <div style="font-size:28px;line-height:1.2;font-weight:800;margin-top:10px">Welcome to The Money Circle, ${esc(name)}.</div>
</td></tr>
<tr><td style="padding:28px 32px 8px;font-size:16px;line-height:1.7">
  <p style="margin:0 0 16px">Dear billionaire,</p>
  <p style="margin:0 0 16px">It is with pleasure that I write to officially welcome you into <strong>The Money Circle</strong>${vip ? " as a member of <strong>The Billionaire Circle</strong>" : ` (${esc(d.pkg.name)})`}. A huge congratulations on taking this massive step toward financial freedom. I am genuinely excited to walk this journey with you.</p>
  <p style="margin:0 0 4px">Below is everything you need to get started. <strong>Please save this email!</strong></p>
</td></tr>
<tr><td style="padding:14px 32px 4px"><div style="font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};font-weight:800">Your onboarding kit</div></td></tr>
${items.map((it, i) => kitItem(i + 1, it.title, it.body, it.links)).join("")}
<tr><td style="padding:14px 32px 0">
  <a href="${esc(kitUrl)}" style="display:block;background:${C.gold};color:${C.ink};text-decoration:none;font-weight:800;font-size:16px;padding:16px 20px;border-radius:12px;text-align:center">Open my onboarding kit &rarr;</a>
  <div style="font-size:12px;color:${C.muted};text-align:center;margin-top:6px">This button signs you in instantly, one time, for 7 days. After that, sign in with your email at ${esc(siteHost)}/login.</div>
</td></tr>
<tr><td style="padding:20px 32px 8px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:14px;font-size:13px;color:${C.muted}">
    <tr><td style="padding:14px 18px;line-height:1.7">
      <strong style="color:${C.ink}">Enrolment summary</strong><br>
      Programme: ${esc(d.pkg.name)}, ${esc(d.offer.label)} · ${esc(d.pkg.duration)}<br>
      Paid: ${esc(price)} · Reference: ${esc(d.reference)}
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:16px 32px 28px;font-size:16px;line-height:1.7">
  <p style="margin:0 0 16px">If you have any questions, please reply to this email${d.whatsappUrl ? ` or <a href="${esc(d.whatsappUrl)}" style="color:${C.green};font-weight:700">send a WhatsApp message</a>` : ""}.</p>
  <p style="margin:0">With all my love,<br><strong>${esc(coach)}</strong><br><span style="color:${C.muted}">${esc(site.coachTitle)}</span></p>
</td></tr>`;

  const text = [
    "Dear billionaire,",
    "",
    "It is with pleasure that I write to officially welcome you into The Money Circle. A huge congratulations on taking this massive step toward financial freedom. I am genuinely excited to walk this journey with you.",
    "",
    "Below is everything you need to get started. Please save this email!",
    "",
    "YOUR ONBOARDING KIT",
    ...items.flatMap((it, i) => [`${i + 1}. ${it.title}: ${it.body.replace(/<[^>]+>/g, "")}`, ...it.links.map((l) => `   ${l.label}: ${l.url}`), ""]),
    `Open your onboarding kit (signs you in): ${kitUrl}`,
    "",
    `Programme: ${d.pkg.name}, ${d.offer.label} · Paid: ${price} · Reference: ${d.reference}`,
    "",
    `If you have any questions, please reply to this email${d.whatsappUrl ? ` or send a WhatsApp message: ${d.whatsappUrl}` : ""}.`,
    "",
    "With all my love,",
    coach,
    site.coachTitle,
  ].join("\n");

  return { subject, html: shell(inner, "Your vault, financial plan and session booking link are inside. Please save this email!"), text };
}

export function adminNotification(d: {
  title: string;
  rows: [string, string][];
  links?: LetterLink[];
  issues?: string[];
}): { subject: string; html: string; text: string } {
  const inner = `
<tr><td style="background:${C.green};padding:24px 32px;color:#FFFFFF;font-size:22px;font-weight:800">${esc(d.title)}</td></tr>
<tr><td style="padding:20px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6">
${d.rows.map(([k, v]) => `<tr><td style="color:${C.muted};padding:4px 12px 4px 0;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:4px 0;font-weight:600">${esc(v)}</td></tr>`).join("")}
</table></td></tr>
${d.issues?.length ? `<tr><td style="padding:0 32px 12px"><div style="background:#FDECEC;color:#8A1C1C;border-radius:12px;padding:12px 16px;font-size:14px"><strong>Needs attention:</strong><br>${d.issues.map(esc).join("<br>")}</div></td></tr>` : ""}
<tr><td style="padding:0 32px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${(d.links ?? []).map((l, i) => button(l, i === 0)).join("")}</table></td></tr>`;
  const text = [d.title, "", ...d.rows.map(([k, v]) => `${k}: ${v}`), ...(d.issues?.length ? ["", "Needs attention:", ...d.issues] : []), "", ...(d.links ?? []).map((l) => `${l.label}: ${l.url}`)].join("\n");
  return { subject: d.title, html: shell(inner, d.title), text };
}
