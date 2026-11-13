import { OAuth2Client } from "google-auth-library";
import { env } from "./env";

/**
 * Google auth uses a refresh token for the coach's own Google account, so the
 * vault copies live in (and count against) that account's Drive and emails go
 * out from that Gmail address. Generate the token once with `npm run google:auth`.
 */
let client: OAuth2Client | null = null;

export function googleConfigured(): boolean {
  return Boolean(env.googleClientId() && env.googleClientSecret() && env.googleRefreshToken());
}

export function googleAuth(): OAuth2Client {
  if (!googleConfigured()) {
    throw new Error("Google is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN.");
  }
  if (!client) {
    client = new OAuth2Client(env.googleClientId(), env.googleClientSecret());
    client.setCredentials({ refresh_token: env.googleRefreshToken() });
  }
  return client;
}

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/spreadsheets",
];
