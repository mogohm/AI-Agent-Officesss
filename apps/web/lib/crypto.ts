// no server-only: this module is also imported by the standalone worker process
import crypto from "node:crypto";
import { env } from "./env";

// AES-256-GCM encryption for provider credentials. The key is derived from
// CREDENTIAL_ENCRYPTION_KEY. Ciphertext is stored as base64(iv|tag|data).
// Plaintext credentials NEVER leave the server.

const KEY = crypto.createHash("sha256").update(env.CREDENTIAL_ENCRYPTION_KEY).digest(); // 32 bytes

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Mask a secret for safe display (never returns the real value). */
export function maskSecret(plaintext: string): string {
  if (!plaintext) return "";
  const last = plaintext.slice(-4);
  return `••••••••${last}`;
}
