import { env } from "./env";

/**
 * Optional Telegram automation.
 * - Single-use invite links: the bot must be an admin of each group with "Invite users" rights.
 * - Admin pings: a chat ID that receives "New student payment received!" messages.
 * WhatsApp groups cannot be joined programmatically, so for WhatsApp we send the group invite link by email.
 */

async function tg<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = env.telegramBotToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description}`);
  return json.result;
}

export async function createSingleUseInvite(chatId: string, name: string): Promise<string> {
  const result = await tg<{ invite_link: string }>("createChatInviteLink", {
    chat_id: chatId,
    name: name.slice(0, 32),
    member_limit: 1,
    expire_date: Math.floor(Date.now() / 1000) + 14 * 24 * 3600,
  });
  return result.invite_link;
}

export async function notifyAdminTelegram(text: string): Promise<boolean> {
  const chatId = env.telegramAdminChatId();
  if (!env.telegramBotToken() || !chatId) return false;
  await tg("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
  return true;
}
