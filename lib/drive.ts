import { drive as driveApi, type drive_v3 } from "@googleapis/drive";
import { googleAuth } from "./google";
import { env } from "./env";

const FOLDER_MIME = "application/vnd.google-apps.folder";

function drive(): drive_v3.Drive {
  return driveApi({ version: "v3", auth: googleAuth() });
}

/**
 * Renames template items for the client. Supported conventions in your master template:
 *   "{{CLIENT_NAME}}'s Money Tracker"  -> "Ada Obi's Money Tracker"
 *   "[Client Name]'s Money Tracker"    -> "Ada Obi's Money Tracker"
 *   "Master Template Money Tracker"    -> "Ada Obi's Money Tracker"
 *   "Master Money Tracker"             -> "Ada Obi's Money Tracker"
 * Anything else keeps its original name.
 */
export function personaliseName(original: string, clientName: string): string {
  let name = original
    .replace(/\{\{\s*CLIENT[_ ]NAME\s*\}\}/gi, clientName)
    .replace(/\[\s*Client Name\s*\]/gi, clientName);
  if (name !== original) return name;
  const m = original.match(/^\s*Master(?:\s+Template)?\s*[-:–]?\s*(.+)$/i);
  if (m) name = `${clientName}'s ${m[1]}`;
  return name;
}

async function listChildren(folderId: string): Promise<drive_v3.Schema$File[]> {
  const out: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive().files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, shortcutDetails)",
      pageSize: 200,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    out.push(...(res.data.files ?? []));
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return out;
}

async function copyFolderContents(srcFolderId: string, destFolderId: string, clientName: string): Promise<number> {
  let count = 0;
  for (const item of await listChildren(srcFolderId)) {
    const name = personaliseName(item.name ?? "Untitled", clientName);
    if (item.mimeType === FOLDER_MIME) {
      const sub = await drive().files.create({
        requestBody: { name, mimeType: FOLDER_MIME, parents: [destFolderId] },
        fields: "id",
        supportsAllDrives: true,
      });
      count += await copyFolderContents(item.id!, sub.data.id!, clientName);
    } else {
      await drive().files.copy({
        fileId: item.id!,
        requestBody: { name, parents: [destFolderId] },
        fields: "id",
        supportsAllDrives: true,
      });
      count++;
    }
  }
  return count;
}

/** Find a vault already created for this payment reference (makes retries safe). */
async function findExistingVault(reference: string): Promise<drive_v3.Schema$File | null> {
  const res = await drive().files.list({
    q: `appProperties has { key='tmcReference' and value='${reference.replace(/'/g, "")}' } and trashed = false`,
    fields: "files(id, name, webViewLink, appProperties)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return res.data.files?.[0] ?? null;
}

async function shareWithClient(fileId: string, email: string) {
  const base = {
    fileId,
    requestBody: { type: "user", role: "writer", emailAddress: email },
    supportsAllDrives: true,
  };
  try {
    await drive().permissions.create({ ...base, sendNotificationEmail: false });
  } catch (err) {
    // Non-Google email addresses can only be shared with a notification email.
    console.warn("[drive] silent share failed, retrying with Google notification:", (err as Error).message);
    await drive().permissions.create({
      ...base,
      sendNotificationEmail: true,
      emailMessage: "Your personal Money Circle vault is ready. Check your inbox for your acceptance letter!",
    });
  }
}

export interface VaultResult {
  folderId: string;
  url: string;
  filesCopied: number;
  reused: boolean;
}

export async function createClientVault(opts: {
  templateFolderId: string;
  vaultName: string;
  clientName: string;
  clientEmail: string;
  reference: string;
}): Promise<VaultResult> {
  const existing = await findExistingVault(opts.reference);
  if (existing?.appProperties?.tmcStatus === "complete") {
    return { folderId: existing.id!, url: existing.webViewLink!, filesCopied: 0, reused: true };
  }
  if (existing) {
    // A previous attempt died half-way: clear it out and rebuild cleanly.
    await drive().files.update({ fileId: existing.id!, requestBody: { trashed: true }, supportsAllDrives: true });
  }

  const parent = env.vaultsParentFolderId();
  const folder = await drive().files.create({
    requestBody: {
      name: opts.vaultName,
      mimeType: FOLDER_MIME,
      parents: parent ? [parent] : undefined,
      appProperties: { tmcReference: opts.reference, tmcStatus: "building" },
      description: `The Money Circle vault for ${opts.clientName} <${opts.clientEmail}> · ref ${opts.reference}`,
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });
  const folderId = folder.data.id!;

  const filesCopied = await copyFolderContents(opts.templateFolderId, folderId, opts.clientName);
  await shareWithClient(folderId, opts.clientEmail);
  await drive().files.update({
    fileId: folderId,
    requestBody: { appProperties: { tmcReference: opts.reference, tmcStatus: "complete" } },
    supportsAllDrives: true,
  });

  return { folderId, url: folder.data.webViewLink ?? `https://drive.google.com/drive/folders/${folderId}`, filesCopied, reused: false };
}
