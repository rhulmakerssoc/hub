// Scrambles (encrypts) the members' content with the hub password.
//
//   npm run protect
//
// Reads the originals from private/ (never committed) and writes encrypted
// copies to public/protected/ (committed and published). The site can only
// unscramble them with the password, so nothing in the public repository or
// on the live site is readable without it.
//
// Options:
//   --from "D:\some\folder"   read the originals from another folder
//   HUB_PASSWORD=...           supply the password without being asked
//
// How it works: the password is stretched into a key with PBKDF2-SHA256
// (slow on purpose, so passwords can't be guessed quickly), and every file
// is encrypted with AES-256-GCM. An unchanged file always encrypts to the
// same bytes, so git only sees the files you actually changed.

import { webcrypto as crypto } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'protected');
const MANIFEST = join(OUT_DIR, 'vault.json');

const ITERATIONS = 600_000;
const MAGIC = new TextEncoder().encode('MHV1'); // Makers' Hub Vault, version 1
const MIN_PASSWORD_LENGTH = 12;

const TYPES = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.zip': 'application/zip',
  '.stl': 'model/stl',
  '.txt': 'text/plain',
};

async function main() {
  const fromArg = process.argv.indexOf('--from');
  const privateDir = resolve(fromArg > -1 ? process.argv[fromArg + 1] : join(ROOT, 'private'));
  const filesDir = join(privateDir, 'files');

  if (!existsSync(join(privateDir, 'content.json'))) {
    throw new Error(`No content.json found in ${privateDir}. That folder holds the originals; see the README.`);
  }

  // ---- read and check the originals ------------------------------------
  const content = JSON.parse(readFileSync(join(privateDir, 'content.json'), 'utf8'));
  const faqsHtml = stripComments(readFileSync(join(privateDir, 'faqs.html'), 'utf8'));

  const wanted = new Set();
  for (const group of content.labSheetGroups ?? []) {
    for (const sheet of group.sheets ?? []) {
      if (!sheet.title || !sheet.file) throw new Error(`A lab sheet in "${group.heading}" is missing its title or file.`);
      wanted.add(sheet.file);
    }
  }
  for (const match of faqsHtml.matchAll(/data-file="([^"]+)"/g)) wanted.add(match[1]);

  const missing = [...wanted].filter((file) => !existsSync(join(filesDir, file)));
  if (missing.length) {
    throw new Error(`These files are named in content.json or faqs.html but are not in ${filesDir}:\n  ${missing.join('\n  ')}`);
  }

  // ---- password and key --------------------------------------------------
  const previous = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : null;
  const password = await getPassword(previous);
  const salt = password.isNew || !previous ? crypto.getRandomValues(new Uint8Array(16)) : fromBase64(previous.salt);
  const keys = password.keys ?? (await deriveKeys(password.value, salt, ITERATIONS));

  // ---- encrypt -----------------------------------------------------------
  mkdirSync(OUT_DIR, { recursive: true });
  const written = new Set(['vault.json']);
  const files = {};
  let totalBytes = 0;

  for (const file of [...wanted].sort()) {
    const plain = readFileSync(join(filesDir, file));
    const id = await fileId(keys, `file:${file}`);
    writeIfChanged(join(OUT_DIR, `${id}.bin`), await encrypt(keys, plain));
    written.add(`${id}.bin`);
    files[file] = { id, type: TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', size: plain.length };
    totalBytes += plain.length;
  }

  const bundle = new TextEncoder().encode(JSON.stringify({ ...content, faqsHtml, files }));
  const contentId = await fileId(keys, 'content');
  writeIfChanged(join(OUT_DIR, `${contentId}.bin`), await encrypt(keys, bundle));
  written.add(`${contentId}.bin`);

  writeIfChanged(
    MANIFEST,
    Buffer.from(
      JSON.stringify({ version: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: toBase64(salt), content: `${contentId}.bin` }, null, 2) + '\n',
    ),
  );

  // remove encrypted files that are no longer used
  for (const name of readdirSync(OUT_DIR)) {
    if (!written.has(name)) rmSync(join(OUT_DIR, name));
  }

  // ---- report ------------------------------------------------------------
  const skipped = listFiles(filesDir).filter((file) => !wanted.has(file));
  console.log(`\nEncrypted ${wanted.size} files (${(totalBytes / 1024 / 1024).toFixed(1)} MB) and the members' page content into public/protected/.`);
  if (skipped.length) {
    console.log(`Not published, because nothing refers to them:\n  ${skipped.join('\n  ')}`);
  }
  if (password.isNew && previous) console.log('The password has changed. Tell members the new one.');
  console.log('Next: commit and push public/protected/ (never the private/ folder).');
}

// ---------------------------------------------------------------------------
// password
// ---------------------------------------------------------------------------

async function getPassword(previous) {
  const fromEnv = process.env.HUB_PASSWORD;
  const first = fromEnv ?? (await ask('Hub password: '));
  if (!first) throw new Error('No password entered.');

  // Same password as last time? Then keep the same key, so unchanged files stay identical.
  if (previous) {
    const keys = await deriveKeys(first, fromBase64(previous.salt), previous.iterations);
    const sample = join(OUT_DIR, previous.content);
    if (existsSync(sample) && (await canDecrypt(keys, readFileSync(sample)))) {
      if (previous.iterations === ITERATIONS) return { value: first, isNew: false, keys };
      return { value: first, isNew: true };
    }
  }

  // A new password: confirm it, because a typo here would lock every member out.
  console.log(previous ? '\nThat is different from the password used last time, so it will become the NEW password.' : '\nSetting the hub password for the first time.');
  if (first.length < MIN_PASSWORD_LENGTH) {
    console.log(`Warning: it is shorter than ${MIN_PASSWORD_LENGTH} characters. Short or guessable passwords can be cracked; a few random words is much safer.`);
  }
  if (!fromEnv) {
    const second = await ask('Type the new password again to confirm: ');
    if (second !== first) throw new Error('The two passwords did not match. Nothing was changed.');
  }
  return { value: first, isNew: true };
}

/** Asks a question on the terminal without showing what is typed. */
function ask(question) {
  return new Promise((done, fail) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) return fail(new Error('No terminal to ask for the password. Set HUB_PASSWORD instead.'));
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let typed = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          stdout.write('\n');
          return done(typed);
        }
        if (ch === '\u0003') { // Ctrl+C
          stdin.setRawMode(false);
          stdout.write('\n');
          process.exit(1);
        }
        if (ch === '\u007f' || ch === '\b') typed = typed.slice(0, -1);
        else if (ch >= ' ') typed += ch;
      }
    };
    stdin.on('data', onData);
  });
}

// ---------------------------------------------------------------------------
// crypto (must match src/app/core/vault-crypto.ts)
// ---------------------------------------------------------------------------

async function deriveKeys(password, salt, iterations) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
  // 64 bytes: the first 32 are the encryption key (the only part the website
  // needs), the last 32 are used here to name files and pick nonces.
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, 512));
  return {
    aes: await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']),
    mac: await crypto.subtle.importKey('raw', bits.slice(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
  };
}

/** File layout: "MHV1" + 12-byte nonce + AES-GCM ciphertext (which ends with its 16-byte check tag). */
async function encrypt(keys, plain) {
  // The nonce is derived from the file's contents, so the same file always
  // encrypts to the same bytes and two different files never share a nonce.
  const iv = new Uint8Array(await crypto.subtle.sign('HMAC', keys.mac, plain)).slice(0, 12);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keys.aes, plain));
  return Buffer.concat([MAGIC, iv, sealed]);
}

async function canDecrypt(keys, data) {
  try {
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.subarray(4, 16) }, keys.aes, data.subarray(16));
    return true;
  } catch {
    return false;
  }
}

/** A meaningless but stable file name, so published names give nothing away. */
async function fileId(keys, label) {
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', keys.mac, new TextEncoder().encode(label)));
  return Buffer.from(mac.slice(0, 12)).toString('hex');
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function writeIfChanged(path, data) {
  if (existsSync(path) && Buffer.compare(readFileSync(path), data) === 0) return;
  writeFileSync(path, data);
}

function listFiles(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full, base) : [relative(base, full).split(sep).join('/')];
  });
}

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '').trim();
}

function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(text) {
  return new Uint8Array(Buffer.from(text, 'base64'));
}

main().catch((err) => {
  console.error(`\nStopped: ${err.message}`);
  process.exit(1);
});
