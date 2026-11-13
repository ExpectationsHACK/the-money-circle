import { gmail as gmailApi } from "@googleapis/gmail";
import { googleAuth } from "./google";
import { env } from "./env";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

function encodeHeader(value: string): string {
  // RFC 2047 so emojis / naira signs survive in subject lines and names.
  return /^[\x20-\x7E]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function buildMime(msg: OutgoingEmail, from: string, fromName: string): string {
  const boundary = `tmc_${Date.now().toString(36)}`;
  const lines = [
    `From: ${encodeHeader(fromName)} <${from}>`,
    `To: ${msg.to}`,
    ...(msg.replyTo ? [`Reply-To: ${msg.replyTo}`] : []),
    `Subject: ${encodeHeader(msg.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(msg.text, "utf8").toString("base64"),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(msg.html, "utf8").toString("base64"),
    `--${boundary}--`,
  ];
  return lines.join("\r\n");
}

export async function sendEmail(msg: OutgoingEmail): Promise<{ provider: string; id?: string }> {
  const provider = env.emailProvider();
  const replyTo = msg.replyTo ?? env.emailReplyTo();
  const fromName = env.emailFromName();

  if (provider === "console") {
    console.log(`\n[email:console] To: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n`);
    return { provider };
  }

  if (provider === "resend") {
    const key = env.resendApiKey();
    const from = env.emailFrom();
    if (!key || !from) throw new Error("Resend needs RESEND_API_KEY and EMAIL_FROM");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${fromName} <${from}>`,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) throw new Error(`Resend failed (${res.status}): ${json.message ?? "unknown"}`);
    return { provider, id: json.id };
  }

  // Gmail API — sends from the coach's own Google account.
  const from = env.emailFrom();
  if (!from) throw new Error("Gmail sending needs EMAIL_FROM (the Gmail address you authorised)");
  const raw = Buffer.from(buildMime({ ...msg, replyTo }, from, fromName)).toString("base64url");
  const res = await gmailApi({ version: "v1", auth: googleAuth() }).users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
  return { provider: "gmail", id: res.data.id ?? undefined };
}
