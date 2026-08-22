import { describe, expect, it } from "vitest";
import { decryptEmailServiceSecret, encryptEmailServiceSecret } from "./emailAlertCrypto";

describe("proteção da chave do serviço de e-mail", () => {
  it("recupera a chave apenas com a chave de segurança do servidor", () => {
    const original = "re_chave_de_teste";
    const encrypted = encryptEmailServiceSecret(original);

    expect(encrypted.encrypted).not.toContain(original);
    expect(decryptEmailServiceSecret(encrypted.encrypted, encrypted.iv)).toBe(original);
  });
});
