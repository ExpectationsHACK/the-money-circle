import { sheets as sheetsApi, type sheets_v4 } from "@googleapis/sheets";
import { googleAuth, googleConfigured } from "./google";
import { env } from "./env";

/**
 * The enrollment ledger is a Google Sheet: one row per payment reference.
 * It doubles as your student list and as the idempotency guard that stops a
 * retried webhook from creating a second vault or sending a second letter.
 */

export const LEDGER_HEADERS = [
  "Reference",
  "Created At",
  "Full Name",
  "Email",
  "Phone",
  "Package",
  "Offer",
  "Amount (NGN)",
  "Channel",
  "Status",
  "Vault URL",
  "Booking URL",
  "Updated At",
  "Notes",
] as const;

export type LedgerStatus = "processing" | "complete" | "failed" | "awaiting-transfer";

export interface LedgerRow {
  reference: string;
  createdAt: string;
  fullName: string;
  email: string;
  phone: string;
  packageName: string;
  offer: string;
  amountNaira: number;
  channel: string;
  status: LedgerStatus;
  vaultUrl?: string;
  bookingUrl?: string;
  updatedAt?: string;
  notes?: string;
}

function sheets(): sheets_v4.Sheets {
  return sheetsApi({ version: "v4", auth: googleAuth() });
}

export function ledgerConfigured(): boolean {
  return googleConfigured() && Boolean(env.enrollmentsSheetId());
}

const tab = () => env.enrollmentsSheetTab();
const lastCol = String.fromCharCode("A".charCodeAt(0) + LEDGER_HEADERS.length - 1);

function toValues(r: LedgerRow): (string | number)[] {
  return [
    r.reference,
    r.createdAt,
    r.fullName,
    r.email,
    r.phone,
    r.packageName,
    r.offer,
    r.amountNaira,
    r.channel,
    r.status,
    r.vaultUrl ?? "",
    r.bookingUrl ?? "",
    r.updatedAt ?? new Date().toISOString(),
    r.notes ?? "",
  ];
}

async function ensureHeader() {
  const id = env.enrollmentsSheetId()!;
  const res = await sheets().spreadsheets.values.get({ spreadsheetId: id, range: `${tab()}!A1:${lastCol}1` }).catch(async (e) => {
    // Tab missing: create it.
    if (String(e?.message).includes("Unable to parse range")) {
      await sheets().spreadsheets.batchUpdate({
        spreadsheetId: id,
        requestBody: { requests: [{ addSheet: { properties: { title: tab() } } }] },
      });
      return { data: { values: [] as string[][] } };
    }
    throw e;
  });
  if (!res.data.values?.[0]?.length) {
    await sheets().spreadsheets.values.update({
      spreadsheetId: id,
      range: `${tab()}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [LEDGER_HEADERS as unknown as string[]] },
    });
  }
}

/** Returns the row (and its 1-based sheet row number) for a reference, if present. */
export async function findByReference(reference: string): Promise<{ row: LedgerRow; rowNumber: number } | null> {
  const res = await sheets().spreadsheets.values.get({
    spreadsheetId: env.enrollmentsSheetId()!,
    range: `${tab()}!A:${lastCol}`,
  }).catch(() => null);
  const values = res?.data.values ?? [];
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    if (v[0] === reference) {
      return {
        rowNumber: i + 1,
        row: {
          reference: v[0],
          createdAt: v[1],
          fullName: v[2],
          email: v[3],
          phone: v[4],
          packageName: v[5],
          offer: v[6],
          amountNaira: Number(v[7] ?? 0),
          channel: v[8],
          status: v[9] as LedgerStatus,
          vaultUrl: v[10],
          bookingUrl: v[11],
          updatedAt: v[12],
          notes: v[13],
        },
      };
    }
  }
  return null;
}

export async function appendRow(row: LedgerRow): Promise<number> {
  await ensureHeader();
  const res = await sheets().spreadsheets.values.append({
    spreadsheetId: env.enrollmentsSheetId()!,
    range: `${tab()}!A:${lastCol}`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [toValues(row)] },
  });
  const range = res.data.updates?.updatedRange ?? "";
  const m = range.match(/![A-Z]+(\d+)/);
  return m ? Number(m[1]) : -1;
}

export async function updateRow(rowNumber: number, row: LedgerRow): Promise<void> {
  await sheets().spreadsheets.values.update({
    spreadsheetId: env.enrollmentsSheetId()!,
    range: `${tab()}!A${rowNumber}:${lastCol}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [toValues({ ...row, updatedAt: new Date().toISOString() })] },
  });
}
