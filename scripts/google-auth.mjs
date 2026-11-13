// One-time helper: authorises YOUR Google account (Drive + Gmail + Sheets) and prints a refresh token.
// Usage:  GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... npm run google:auth
// (or put both in .env.local first, this script reads it)
import http from "node:http";
import fs from "node:fs";
import { OAuth2Client } from "google-auth-library";

for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (OAuth client of type 'Desktop app') first.");
  process.exit(1);
}

const PORT = 5555;
const redirect = `http://127.0.0.1:${PORT}/callback`;
const client = new OAuth2Client(clientId, clientSecret, redirect);
const url = client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/spreadsheets",
  ],
});

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url ?? "/", redirect);
  if (u.pathname !== "/callback") return res.end();
  const code = u.searchParams.get("code");
  if (!code) {
    res.end("No code received.");
    return;
  }
  try {
    const { tokens } = await client.getToken(code);
    res.end("Done! Return to your terminal.");
    console.log("\nAdd this line to .env.local (and your hosting env vars):\n");
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  } catch (e) {
    res.end("Token exchange failed, see terminal.");
    console.error(e);
  } finally {
    server.close();
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("\nOpen this URL in your browser and sign in with the Google account that owns your Master Vaults:\n");
  console.log(url + "\n");
});
