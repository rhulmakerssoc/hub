import { Injectable, signal } from '@angular/core';
import { MembersContent } from './members-content';
import { VaultManifest, decrypt, deriveKeyBytes, fromBase64, importKey, toBase64 } from './vault-crypto';

const STORAGE_KEY = 'makers_hub_key';
const PROTECTED_DIR = 'protected/';

/**
 * Holds the members' content.
 *
 * Everything members-only (lab sheets, FAQ wording, calendar and community
 * links) is published encrypted in public/protected/. Signing in turns the
 * password into the decryption key; if the content decrypts, the password
 * was right. The key is kept for the browser tab's session so a refresh
 * doesn't ask again, and is forgotten on Log Out or when the tab closes.
 */
@Injectable({ providedIn: 'root' })
export class VaultService {
  private key: CryptoKey | null = null;
  private restoring: Promise<boolean> | null = null;
  private readonly fileUrls = new Map<string, Promise<string>>();

  private readonly unlockedContent = signal<MembersContent | null>(null);
  private readonly session = signal(readStoredKey() !== null);

  /** The decrypted members' content, or null while locked. */
  readonly content = this.unlockedContent.asReadonly();

  /** True if this tab has signed in (the content may still need restoring after a refresh). */
  readonly hasSession = this.session.asReadonly();

  /** Signs in. Returns false if the password is wrong. */
  async unlock(password: string): Promise<boolean> {
    const manifest = await this.fetchManifest();
    const keyBytes = await deriveKeyBytes(password, fromBase64(manifest.salt), manifest.iterations);
    const opened = await this.open(keyBytes, manifest);
    if (opened) storeKey(keyBytes);
    return opened;
  }

  /** After a refresh: reopen the content with the key kept for this session. */
  restore(): Promise<boolean> {
    if (this.unlockedContent()) return Promise.resolve(true);
    this.restoring ??= this.restoreFromSession().finally(() => (this.restoring = null));
    return this.restoring;
  }

  /** Log out: forget the key and everything decrypted. */
  lock(): void {
    clearStoredKey();
    this.key = null;
    this.session.set(false);
    this.unlockedContent.set(null);
    for (const url of this.fileUrls.values()) {
      url.then((u) => URL.revokeObjectURL(u)).catch(() => undefined);
    }
    this.fileUrls.clear();
  }

  /** Decrypts one protected file, named by its path inside private/files/. */
  async fileBytes(path: string): Promise<Uint8Array<ArrayBuffer>> {
    const entry = this.unlockedContent()?.files[path];
    if (!this.key || !entry) throw new Error(`Protected file not available: ${path}`);
    return decrypt(this.key, await fetchBytes(`${PROTECTED_DIR}${entry.id}.bin`));
  }

  /** A temporary address for a decrypted file, for <img src> or a download link. */
  fileUrl(path: string): Promise<string> {
    let url = this.fileUrls.get(path);
    if (!url) {
      const type = this.unlockedContent()?.files[path]?.type ?? 'application/octet-stream';
      url = this.fileBytes(path).then((bytes) => URL.createObjectURL(new Blob([bytes], { type })));
      url.catch(() => this.fileUrls.delete(path));
      this.fileUrls.set(path, url);
    }
    return url;
  }

  private async restoreFromSession(): Promise<boolean> {
    const keyBytes = readStoredKey();
    if (!keyBytes) return false;
    try {
      if (await this.open(keyBytes, await this.fetchManifest())) return true;
    } catch {
      /* fall through: treat as signed out */
    }
    // The stored key no longer opens the content (e.g. the password was changed).
    this.lock();
    return false;
  }

  private async open(keyBytes: Uint8Array<ArrayBuffer>, manifest: VaultManifest): Promise<boolean> {
    const key = await importKey(keyBytes);
    const sealed = await fetchBytes(PROTECTED_DIR + manifest.content);
    let plain: Uint8Array<ArrayBuffer>;
    try {
      plain = await decrypt(key, sealed);
    } catch {
      return false; // wrong key
    }
    this.key = key;
    this.unlockedContent.set(JSON.parse(new TextDecoder().decode(plain)) as MembersContent);
    this.session.set(true);
    return true;
  }

  private async fetchManifest(): Promise<VaultManifest> {
    // no-cache: after a password change, pick up the new salt straight away
    const response = await fetch(new URL(`${PROTECTED_DIR}vault.json`, document.baseURI), { cache: 'no-cache' });
    if (!response.ok) throw new Error('Could not load the members’ content. Check your connection and try again.');
    return (await response.json()) as VaultManifest;
  }
}

async function fetchBytes(path: string): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(new URL(path, document.baseURI));
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

function readStoredKey(): Uint8Array<ArrayBuffer> | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? fromBase64(stored) : null;
  } catch {
    return null;
  }
}

function storeKey(keyBytes: Uint8Array<ArrayBuffer>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, toBase64(keyBytes));
  } catch {
    /* storage unavailable (some private modes): stay signed in until the next refresh */
  }
}

function clearStoredKey(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}
