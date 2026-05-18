import { google } from "googleapis";
import { env } from "../env";
import { decrypt, encrypt } from "../crypto";

export function oauth2Client() {
  return new google.auth.OAuth2(
    env.google.clientId,
    env.google.clientSecret,
    env.google.redirectUri
  );
}

export function generateAuthUrl(state: string) {
  const c = oauth2Client();
  return c.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar"],
    state,
  });
}

export type StoredTokens = { access_token: string; refresh_token: string; expiry_date?: number };

export function encryptTokens(t: StoredTokens): string {
  return encrypt(JSON.stringify(t));
}
function decryptTokens(s: string): StoredTokens {
  return JSON.parse(decrypt(s));
}

export function calendarClientFromTokens(tokensJson: string) {
  const auth = oauth2Client();
  auth.setCredentials(decryptTokens(tokensJson));
  return google.calendar({ version: "v3", auth });
}
