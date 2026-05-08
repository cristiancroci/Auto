// crypto.js - Web Crypto helpers for AES-GCM and PIN hashing

const enc = new TextEncoder();
const dec = new TextDecoder();

// AES key generation and export/import
async function generateAesKeyB64() {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt','decrypt']);
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

async function importAesKeyFromB64(b64) {
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw.buffer, 'AES-GCM', false, ['encrypt','decrypt']);
}

// encrypt plain text with AES key (b64)
async function encryptWithKeyB64(keyB64, plainText) {
  const key = await importAesKeyFromB64(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plainText));
  // return iv + cipher as base64
  const combined = new Uint8Array(iv.byteLength + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

async function decryptWithKeyB64(keyB64, cipherB64) {
  const combined = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const key = await importAesKeyFromB64(keyB64);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return dec.decode(plain);
}

// PIN hashing for local unlock (PBKDF2 -> SHA-256)
async function derivePinHashLocal(pin, saltUint8) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltUint8, iterations: 150000, hash: 'SHA-256' }, base, 256);
  // return hex or base64
  const arr = new Uint8Array(derived);
  return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
}
