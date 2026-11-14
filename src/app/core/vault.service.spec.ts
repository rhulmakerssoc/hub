import { TestBed } from '@angular/core/testing';
import { MembersContent } from './members-content';
import { VaultManifest, decrypt, deriveKeyBytes, encrypt, fromBase64, importKey, toBase64 } from './vault-crypto';
import { VaultService } from './vault.service';

// A small stand-in for public/protected/, encrypted with a throwaway password.
const PASSWORD = 'unit-test-password';
const ITERATIONS = 1000; // low, to keep the tests fast
const SALT = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
const PDF_BYTES = new TextEncoder().encode('%PDF-1.7 pretend lab sheet');

const CONTENT: MembersContent = {
  calendarEmbedUrl: 'https://calendar.example/embed',
  community: [{ label: 'Chat', url: 'https://chat.example/invite', icon: 'fa-brands fa-discord' }],
  labSheetGroups: [{ heading: 'Soldering', sheets: [{ title: 'Starter', file: 'pdf/starter.pdf' }] }],
  faqsHtml: '<section><h2>Question</h2></section>',
  files: { 'pdf/starter.pdf': { id: 'aaaa', type: 'application/pdf', size: PDF_BYTES.length } },
};

let served: Record<string, Uint8Array<ArrayBuffer>>;
let requested: string[];

async function publish(password: string): Promise<void> {
  const key = await importKey(await deriveKeyBytes(password, SALT, ITERATIONS));
  const manifest: VaultManifest = { version: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: toBase64(SALT), content: 'content.bin' };
  served = {
    'protected/vault.json': new TextEncoder().encode(JSON.stringify(manifest)),
    'protected/content.bin': await encrypt(key, new TextEncoder().encode(JSON.stringify(CONTENT))),
    'protected/aaaa.bin': await encrypt(key, PDF_BYTES),
  };
}

describe('vault-crypto', () => {
  it('decrypts what it encrypted', async () => {
    const key = await importKey(await deriveKeyBytes(PASSWORD, SALT, ITERATIONS));
    const sealed = await encrypt(key, PDF_BYTES);
    expect(Array.from(await decrypt(key, sealed))).toEqual(Array.from(PDF_BYTES));
  });

  it('does not leave the original readable in the encrypted file', async () => {
    const key = await importKey(await deriveKeyBytes(PASSWORD, SALT, ITERATIONS));
    const sealed = new TextDecoder('latin1').decode(await encrypt(key, PDF_BYTES));
    expect(sealed).not.toContain('PDF');
    expect(sealed).not.toContain('lab sheet');
  });

  it('refuses the wrong password', async () => {
    const right = await importKey(await deriveKeyBytes(PASSWORD, SALT, ITERATIONS));
    const wrong = await importKey(await deriveKeyBytes(PASSWORD + '!', SALT, ITERATIONS));
    await expect(decrypt(wrong, await encrypt(right, PDF_BYTES))).rejects.toThrow();
  });

  it('refuses a file that has been altered', async () => {
    const key = await importKey(await deriveKeyBytes(PASSWORD, SALT, ITERATIONS));
    const sealed = await encrypt(key, PDF_BYTES);
    sealed[sealed.length - 1] ^= 1;
    await expect(decrypt(key, sealed)).rejects.toThrow();
  });

  it('derives the standard PBKDF2-SHA256 key (so it matches scripts/protect.mjs)', async () => {
    // Published test vector: password "password", salt "salt", 1 iteration
    const key = await deriveKeyBytes('password', new TextEncoder().encode('salt'), 1);
    expect(toBase64(key)).toBe(toBase64(hex('120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b')));
  });

  it('round-trips base64', () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255]);
    expect(Array.from(fromBase64(toBase64(bytes)))).toEqual(Array.from(bytes));
  });
});

describe('VaultService', () => {
  const realFetch = globalThis.fetch;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
    requested = [];
    await publish(PASSWORD);
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname.replace(/^\//, '');
      requested.push(path);
      const body = served[path];
      return body ? new Response(body) : new Response('not found', { status: 404 });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('stays locked with the wrong password', async () => {
    const vault = TestBed.inject(VaultService);
    expect(await vault.unlock('wrong')).toBe(false);
    expect(vault.content()).toBeNull();
    expect(vault.hasSession()).toBe(false);
    expect(sessionStorage.length).toBe(0);
  });

  it('unlocks the members’ content with the right password', async () => {
    const vault = TestBed.inject(VaultService);
    expect(await vault.unlock(PASSWORD)).toBe(true);
    expect(vault.content()).toEqual(CONTENT);
    expect(vault.hasSession()).toBe(true);
  });

  it('never stores the password itself', async () => {
    const vault = TestBed.inject(VaultService);
    await vault.unlock(PASSWORD);
    const stored = Object.values({ ...sessionStorage }).join(' ');
    expect(stored).not.toContain(PASSWORD);
  });

  it('decrypts a protected file on request, and only then downloads it', async () => {
    const vault = TestBed.inject(VaultService);
    await vault.unlock(PASSWORD);
    expect(requested).not.toContain('protected/aaaa.bin');

    const bytes = await vault.fileBytes('pdf/starter.pdf');
    expect(new TextDecoder().decode(bytes)).toBe('%PDF-1.7 pretend lab sheet');
    expect(requested).toContain('protected/aaaa.bin');
  });

  it('will not hand out files while locked', async () => {
    const vault = TestBed.inject(VaultService);
    await expect(vault.fileBytes('pdf/starter.pdf')).rejects.toThrow();
  });

  it('reopens after a refresh without asking for the password again', async () => {
    await TestBed.inject(VaultService).unlock(PASSWORD);

    TestBed.resetTestingModule(); // a fresh page load in the same tab
    const afterRefresh = TestBed.inject(VaultService);
    expect(afterRefresh.content()).toBeNull();
    expect(await afterRefresh.restore()).toBe(true);
    expect(afterRefresh.content()).toEqual(CONTENT);
  });

  it('has nothing to restore in a tab that never signed in', async () => {
    expect(await TestBed.inject(VaultService).restore()).toBe(false);
  });

  it('signs the tab out if the password has been changed since', async () => {
    await TestBed.inject(VaultService).unlock(PASSWORD);
    await publish('a brand new password'); // committee re-ran "npm run protect"

    TestBed.resetTestingModule();
    const afterRefresh = TestBed.inject(VaultService);
    expect(await afterRefresh.restore()).toBe(false);
    expect(afterRefresh.hasSession()).toBe(false);
    expect(sessionStorage.length).toBe(0);
  });

  it('forgets everything on lock', async () => {
    const vault = TestBed.inject(VaultService);
    await vault.unlock(PASSWORD);
    vault.lock();
    expect(vault.content()).toBeNull();
    expect(vault.hasSession()).toBe(false);
    expect(sessionStorage.length).toBe(0);
    await expect(vault.fileBytes('pdf/starter.pdf')).rejects.toThrow();
  });
});

function hex(text: string): Uint8Array {
  return new Uint8Array(text.match(/../g)!.map((pair) => parseInt(pair, 16)));
}
