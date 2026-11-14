/*
 * The encryption format shared with scripts/protect.mjs. If you change one, change the other.
 *
 *   key   = PBKDF2-SHA256(password, salt, iterations) → first 32 bytes
 *   file  = "MHV1" + 12-byte nonce + AES-256-GCM ciphertext (ends with its 16-byte tag)
 *
 * AES-GCM refuses to decrypt with the wrong key, so a successful decrypt is also the proof that the password was right. No copy or hash of the password is stored anywhere.
 */

const MAGIC = [0x4d, 0x48, 0x56, 0x31]; // "MHV1"
const NONCE_LENGTH = 12;

export interface VaultManifest {
  version: number;
  kdf: string;
  iterations: number;
  /** base64 */
  salt: string;
  /** file name of the encrypted members' content inside protected/ */
  content: string;
}

/** Stretches the password into the 32-byte encryption key. Slow on purpose. */
export async function deriveKeyBytes(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array<ArrayBuffer>> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, 256);
  return new Uint8Array(bits);
}

export function importKey(keyBytes: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Throws if the key is wrong or the data has been altered. */
export async function decrypt(key: CryptoKey, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  if (data.length < MAGIC.length + NONCE_LENGTH + 16 || MAGIC.some((byte, i) => data[i] !== byte)) {
    throw new Error('Not a Makers’ Hub encrypted file');
  }
  const iv = data.subarray(MAGIC.length, MAGIC.length + NONCE_LENGTH);
  const sealed = data.subarray(MAGIC.length + NONCE_LENGTH);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, sealed));
}

/** Used by the unit tests; the real files are encrypted by scripts/protect.mjs. */
export async function encrypt(key: CryptoKey, plain: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const iv = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  const out = new Uint8Array(MAGIC.length + NONCE_LENGTH + sealed.length);
  out.set(MAGIC, 0);
  out.set(iv, MAGIC.length);
  out.set(sealed, MAGIC.length + NONCE_LENGTH);
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
