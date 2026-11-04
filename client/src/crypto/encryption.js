const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64(bytes) {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Derives a strong AES-256-GCM CryptoKey from passphrase + salt using PBKDF2
 */
export async function deriveEncryptionKey(passphrase, salt) {
  const saltBytes = typeof salt === "string" 
    ? (salt.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(salt) ? hexToBytes(salt) : encoder.encode(salt))
    : salt;

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts raw bytes with AES-256-GCM
 */
export async function encryptBytes(bytes, key) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    bytes
  );

  return {
    ciphertext: new Uint8Array(ciphertextBuffer),
    nonce: toBase64(nonce)
  };
}

/**
 * Decrypts raw bytes with AES-256-GCM
 */
export async function decryptBytes(ciphertextBytes, nonceBase64, key) {
  const nonce = fromBase64(nonceBase64);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    ciphertextBytes
  );
  return new Uint8Array(decryptedBuffer);
}

/**
 * Encrypts a client File or Blob in the browser
 */
export async function encryptFile(file, key) {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const { ciphertext, nonce } = await encryptBytes(bytes, key);

  const encryptedBlob = new Blob([ciphertext], { type: "application/octet-stream" });
  return {
    encryptedBlob,
    nonce,
    sizeBytes: encryptedBlob.size
  };
}

/**
 * Decrypts ciphertext ArrayBuffer into a typed Blob ready for download or preview
 */
export async function decryptFileToBlob(ciphertextBuffer, nonceBase64, key, mimeType = "application/octet-stream") {
  const ciphertextBytes = new Uint8Array(ciphertextBuffer);
  const decryptedBytes = await decryptBytes(ciphertextBytes, nonceBase64, key);
  return new Blob([decryptedBytes], { type: mimeType });
}

/**
 * Encrypts string (e.g. file names or notes)
 */
export async function encryptText(text, key) {
  const bytes = encoder.encode(text);
  const { ciphertext, nonce } = await encryptBytes(bytes, key);
  return {
    ciphertextBase64: toBase64(ciphertext),
    nonce
  };
}

/**
 * Decrypts string
 */
export async function decryptText(ciphertextBase64, nonceBase64, key) {
  const ciphertextBytes = fromBase64(ciphertextBase64);
  const decryptedBytes = await decryptBytes(ciphertextBytes, nonceBase64, key);
  return decoder.decode(decryptedBytes);
}
