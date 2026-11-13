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
  vaultUrl?: string;
  bookingUrl?: string;
  appUrl?: string;
  communities: LetterLink[];
  resources: LetterLink[];
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

export function acceptanceLetter(d: AcceptanceData): { subject: string; html: string; text: string } {
  const name = firstName(d.fullName);
  const vip = Boolean(d.pkg.vip);
  const subject = vip
    ? `${name}, welcome to The Billionaire Circle 👑 Your VIP acceptance letter`
    : `${name}, you're in! Your official ${d.pkg.name} acceptance letter 🎉`;

  const opening = vip
    ? `This is your official VIP acceptance into <strong>The Billionaire Circle</strong>, our all-access, six-month transformation. You didn't just pick a programme. You picked <em>everything</em>: structure for your income, a portfolio that works while you sleep, and a brand-new income stream. I'm honoured you trust me with this.`
    : d.pkg.route === "launchpad"
      ? `This is your official acceptance into <strong>LaunchPad</strong>. You've decided your skills deserve to pay you, and that's the kind of decision that changes a bank balance. From today we stop planning and start <em>executing</em>, milestone by milestone, until that first sale lands.`
      : d.pkg.route === "academy"
        ? `This is your official acceptance into <strong>The Money Circle Academy</strong>. Taking a hard look at your money takes guts, and you just did it. We're going to heal your relationship with money, rewire the old habits and build foundations that actually hold.`
        : `This is your official acceptance into <strong>Foundation &amp; Wealth</strong>, your six-month journey from reactive spending to real structure, real savings and real investments. The leaking stops here. The building starts now.`;

  const primary: LetterLink[] = [];
  if (d.vaultUrl) primary.push({ label: d.pkg.automation.vaultLabel ?? "Open your Money Vault", url: d.vaultUrl });
  if (d.bookingUrl) primary.push({ label: d.pkg.automation.bookingLabel, url: d.bookingUrl });
  if (d.appUrl) primary.push({ label: "Open your Money Circle app", url: d.appUrl });

  const steps: string[] = [];
  if (d.appUrl)
    steps.push(`<strong>Sign in to your Money Circle app.</strong> Your dashboard, budget, goals and trackers live there, on your phone or laptop.`);
  if (d.vaultUrl)
    steps.push(
      `<strong>Open your personal Vault.</strong> I've built it just for you. Every tracker inside has your name on it and is shared privately with this email address.`,
    );
  if (d.bookingUrl)
    steps.push(
      d.pkg.route === "academy"
        ? `<strong>Save the Money Therapy dates.</strong> Our live group calls are where the breakthroughs happen.`
        : `<strong>Book your first ${d.pkg.route === "launchpad" ? "kickoff session" : "Money Date"}.</strong> Pick any open slot on my calendar. The short questionnaire helps me prepare for you.`,
    );
  if (d.communities.length) steps.push(`<strong>Join your circle${d.communities.length > 1 ? "s" : ""}.</strong> Say hi, introduce yourself, and tell us your #1 money goal.`);
  if (d.resources.length) steps.push(`<strong>Start a masterclass.</strong> Budgeting 101 is a perfect first watch.`);

  const price = `${formatNaira(d.offer.priceNaira)}${billingSuffix(d.offer.billing)}`;

  const inner = `
<tr><td style="background:${C.green};padding:32px;color:#FFFFFF">
  <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.gold};font-weight:700">${vip ? "VIP Acceptance Letter" : "Official Acceptance Letter"}</div>
  <div style="font-size:28px;line-height:1.2;font-weight:800;margin-top:10px">Congratulations, ${esc(name)}.<br>You're officially in the Circle.</div>
</td></tr>
<tr><td style="padding:28px 32px 8px;font-size:16px;line-height:1.65">
  <p style="margin:0 0 16px">Dear ${esc(d.fullName)},</p>
  <p style="margin:0 0 16px">${opening}</p>
  <p style="margin:0 0 8px">Everything you need is ready and waiting. No forms, no waiting on me:</p>
</td></tr>
<tr><td style="padding:8px 32px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  ${primary.map((l, i) => button(l, i === 0)).join("")}
  ${d.communities.map((l) => button(l, false)).join("")}
  ${d.resources.map((l) => button(l, false)).join("")}
</table></td></tr>
${
  steps.length
    ? `<tr><td style="padding:20px 32px 8px;font-size:15px;line-height:1.6">
  <div style="font-weight:800;font-size:17px;margin-bottom:10px">Your first 48 hours</div>
  <ol style="margin:0;padding-left:20px">${steps.map((s) => `<li style="margin-bottom:10px">${s}</li>`).join("")}</ol>
</td></tr>`
    : ""
}
<tr><td style="padding:12px 32px 8px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:14px;font-size:13px;color:${C.muted}">
    <tr><td style="padding:14px 18px;line-height:1.7">
      <strong style="color:${C.ink}">Enrolment summary</strong><br>
      Programme: ${esc(d.pkg.name)}, ${esc(d.offer.label)}<br>
      Duration: ${esc(d.pkg.duration)}<br>
      Paid: ${esc(price)}<br>
      Reference: ${esc(d.reference)}
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:20px 32px 28px;font-size:16px;line-height:1.65">
  <p style="margin:0 0 16px">The next six months will not look like the last six. I'll be in your corner the whole way, cheering the wins and calling you higher when it gets hard.</p>
  <p style="margin:0">Let's get this money,<br><strong>${esc(site.coachName)}</strong><br><span style="color:${C.muted}">${esc(site.name)}</span></p>
</td></tr>`;

  const text = [
    `Congratulations, ${name}! You're officially in ${site.name}.`,
    "",
    `Dear ${d.fullName},`,
    "",
    opening.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&"),
    "",
    ...primary.map((l) => `${l.label}: ${l.url}`),
    ...d.communities.map((l) => `${l.label}: ${l.url}`),
    ...d.resources.map((l) => `${l.label}: ${l.url}`),
    "",
    `Programme: ${d.pkg.name}, ${d.offer.label}`,
    `Paid: ${price}`,
    `Reference: ${d.reference}`,
    "",
    `Let's get this money,`,
    site.coachName,
  ].join("\n");

  return { subject, html: shell(inner, `Your ${d.pkg.name} vault, booking link and community access are inside.`), text };
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
