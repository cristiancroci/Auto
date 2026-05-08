// drive-sync.js
// Requirements: <script src="https://apis.google.com/js/api.js"></script> loaded before this file

const GAPI_CLIENT_ID = '776375898567-ee2jfmfd9cte7dp6fj02k5ubpvag4e29.apps.googleusercontent.com';
const GAPI_SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

async function gdriveInit(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(()=>{ if(!done){ done=true; reject(new Error('gapi load timeout')); } }, timeoutMs);
    try {
      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({ clientId: GAPI_CLIENT_ID, scope: GAPI_SCOPES });
          if (!done) { done = true; clearTimeout(timer); resolve(); }
        } catch (e) { if (!done) { done = true; clearTimeout(timer); reject(e); } }
      });
    } catch (e) { if (!done) { done = true; clearTimeout(timer); reject(e); } }
  });
}

async function ensureSignedIn() {
  const auth = gapi.auth2.getAuthInstance();
  if (!auth) throw new Error('Auth instance missing');
  if (!auth.isSignedIn.get()) await auth.signIn();
  return auth.currentUser.get();
}

async function getAccessToken() {
  const auth = gapi.auth2.getAuthInstance();
  if (!auth) throw new Error('Auth instance missing');
  if (!auth.isSignedIn.get()) await auth.signIn();
  const tokenObj = auth.currentUser.get().getAuthResponse(true);
  return tokenObj.access_token;
}

// find file in appDataFolder by name
async function findFileByName(name) {
  const res = await gapi.client.drive.files.list({
    spaces: 'appDataFolder',
    q: `name='${name}'`,
    fields: 'files(id,name,modifiedTime,size)'
  });
  return res.result.files && res.result.files[0];
}

// Save key (base64) to Drive as vault_key.json
async function saveKeyToDrive(keyB64) {
  await ensureSignedIn();
  const existing = await findFileByName('vault_key.json');
  const metadata = { name: 'vault_key.json', parents: ['appDataFolder'] };
  const blob = new Blob([keyB64], { type: 'application/json' });
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob, 'vault_key.json');

  const token = await getAccessToken();
  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const res = await fetch(url, { method: existing ? 'PATCH' : 'POST', headers: { Authorization: 'Bearer ' + token }, body: form });
  if (!res.ok) throw new Error('Key upload failed: ' + res.status);
  return await res.json();
}

async function loadKeyFromDrive() {
  await ensureSignedIn();
  const file = await findFileByName('vault_key.json');
  if (!file) return null;
  const token = await getAccessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('Key download failed: ' + res.status);
  const text = await res.text();
  return text;
}

// Save vault (encrypted base64) to Drive as vault_blob.json
async function saveVaultToDrive(encryptedB64) {
  await ensureSignedIn();
  const existing = await findFileByName('vault_blob.json');
  const metadata = { name: 'vault_blob.json', parents: ['appDataFolder'] };
  const blob = new Blob([encryptedB64], { type: 'application/octet-stream' });
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob, 'vault_blob.json');

  const token = await getAccessToken();
  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const res = await fetch(url, { method: existing ? 'PATCH' : 'POST', headers: { Authorization: 'Bearer ' + token }, body: form });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error('Vault upload failed: ' + res.status + ' ' + txt);
  }
  return await res.json();
}

async function loadVaultFromDrive() {
  await ensureSignedIn();
  const file = await findFileByName('vault_blob.json');
  if (!file) return null;
  const token = await getAccessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('Vault download failed: ' + res.status);
  const text = await res.text();
  return text;
}

// Public helpers used by index.html
async function createAndSaveKeyIfMissing() {
  // check Drive for key
  const existing = await loadKeyFromDrive();
  if (existing) return existing;
  const keyB64 = await generateAesKeyB64(); // from crypto.js
  await saveKeyToDrive(keyB64);
  return keyB64;
}

// Expose functions globally
window.gdriveInit = gdriveInit;
window.saveKeyToDrive = saveKeyToDrive;
window.loadKeyFromDrive = loadKeyFromDrive;
window.saveVaultToDrive = saveVaultToDrive;
window.loadVaultFromDrive = loadVaultFromDrive;
window.createAndSaveKeyIfMissing = createAndSaveKeyIfMissing;

// ensureKeyLoaded used by index.html
window.loadKeyFromDrive = loadKeyFromDrive;
window.ensureKeyLoaded = async function(){
  let k = localStorage.getItem('vault_key_b64');
  if (k) return k;
  await gdriveInit();
  const remote = await loadKeyFromDrive();
  if (remote) {
    localStorage.setItem('vault_key_b64', remote);
    return remote;
  }
  // create new key and save
  const newKey = await generateAesKeyB64();
  await saveKeyToDrive(newKey);
  localStorage.setItem('vault_key_b64', newKey);
  return newKey;
};
