import { describe, it, expect } from "vitest";
import {
  deriveEncryptionKey,
  encryptBytes,
  decryptBytes,
  encryptText,
  decryptText
} from "./encryption.js";

describe("VaultDrive Client-Side E2EE", () => {
  it("derives key and encrypts/decrypts byte payload correctly", async () => {
    const salt = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
    const key = await deriveEncryptionKey("SuperSecurePassphrase123!", salt);

    const message = "VaultDrive Zero-Knowledge Cloud Storage";
    const originalBytes = new TextEncoder().encode(message);

    const encrypted = await encryptBytes(originalBytes, key);
    expect(encrypted.ciphertext).toBeInstanceOf(Uint8Array);
    expect(encrypted.nonce).toBeTypeOf("string");

    const decrypted = await decryptBytes(encrypted.ciphertext, encrypted.nonce, key);
    expect(new TextDecoder().decode(decrypted)).toBe(message);
  });

  it("encrypts and decrypts strings with encryptText / decryptText", async () => {
    const salt = "99887766554433221100aabbccddeeff";
    const key = await deriveEncryptionKey("MySecretKey456$", salt);

    const sensitiveName = "my-private-tax-document.pdf";
    const { ciphertextBase64, nonce } = await encryptText(sensitiveName, key);

    const decrypted = await decryptText(ciphertextBase64, nonce, key);
    expect(decrypted).toBe(sensitiveName);
  });

  it("fails decryption if ciphertext is tampered with (AES-GCM authentication)", async () => {
    const salt = "1234567890abcdef1234567890abcdef";
    const key = await deriveEncryptionKey("TestKeyPass", salt);

    const original = new TextEncoder().encode("Authentic data");
    const encrypted = await encryptBytes(original, key);

    // Tamper with one byte
    const tampered = new Uint8Array(encrypted.ciphertext);
    tampered[0] ^= 0xff;

    await expect(decryptBytes(tampered, encrypted.nonce, key)).rejects.toThrow();
  });
});
