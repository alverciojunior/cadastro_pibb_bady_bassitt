import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ENV } from "./_core/env";

function getEncryptionKey() {
  if (!ENV.cookieSecret) {
    throw new Error("Chave de segurança do servidor indisponível");
  }

  return createHash("sha256")
    .update(`pibb-email-alerts:${ENV.cookieSecret}`)
    .digest();
}

export function encryptEmailServiceSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: Buffer.concat([authTag, encrypted]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function decryptEmailServiceSecret(encryptedValue: string, ivValue: string) {
  const payload = Buffer.from(encryptedValue, "base64");
  const authTag = payload.subarray(0, 16);
  const encrypted = payload.subarray(16);
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
