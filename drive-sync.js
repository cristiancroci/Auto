// drive-sync.js — versione che forza richiesta token sincrona dal click
const GAPI_CLIENT_ID = '776375898567-ee2jfmfd9cte7dp6fj02k5ubpvag4e29.apps.googleusercontent.com';
const GAPI_SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

let tokenClient = null;
let currentAccessToken = null;
let tokenExpiry = 0;

// initTokenClient non fa request; solo inizializza tokenClient
function initTokenClient() {
  if (tokenClient) return;
  if (!window.google || !google.accounts || !google.accounts.oauth2) {
    console.warn('GSI client non disponibile');
    return;
  }
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GAPI_CLIENT_ID,
    scope: GAPI_SCOPES,
    callback: (resp) => {
      // callback viene chiamata dopo requestAccessToken
      if (resp && resp.access_token) {
        currentAccessToken = resp.access_token;
        tokenExpiry = Date.now() + (resp.expires_in ? resp.expires_in * 1000 : 55 * 60 * 1000);
        console.log('Token ottenuto');
      } else {
        console.warn('Token callback senza access_token', resp);
      }
    }
  });
}

// Questa funzione viene esposta per essere chiamata direttamente dal click handler
// Deve essere invocata SINCRONAMENTE dentro il click handler per preservare il gesto utente.
window.requestGsiTokenSync = function(){
  try {
    initTokenClient();
    if (!tokenClient) {
      console.warn('tokenClient non inizializzato');
      return false;
    }
    // Chiamata immediata: popup viene aperto dal browser come risultato del click
    tokenClient.requestAccessToken({ prompt: 'consent' });
    return true;
  } catch (e) {
    console.error('requestGsiTokenSync error', e);
    return false;
  }
};

// Funzioni per ottenere token in modo sicuro (usate internamente)
async function requestAccessTokenInteractive() {
  initTokenClient();
  if (!tokenClient) throw new Error('Token client non inizializzato');
  return new Promise((resolve, reject) => {
    // requestAccessToken avvia popup; callback popolerà currentAccessToken
    tokenClient.requestAccessToken({ prompt: 'consent' });
    const start = Date.now();
    const t = setInterval(() => {
      if (currentAccessToken) { clearInterval(t); return resolve(currentAccessToken); }
      if (Date.now() - start > 20000) { clearInterval(t); return reject(new Error('Timeout token')); }
    }, 200);
  });
}

async function requestAccessTokenSilent() {
  initTokenClient();
  if (!tokenClient) throw new Error('Token client non inizializzato');
  return new Promise((resolve, reject) => {
    tokenClient.requestAccessToken({ prompt: '' });
    const start = Date.now();
    const t = setInterval(() => {
      if (currentAccessToken) { clearInterval(t); return resolve(currentAccessToken); }
      if (Date.now() - start > 15000) { clearInterval(t); return reject(new Error('Timeout token silent')); }
    }, 200);
  });
}

async function getAccessToken() {
  if (currentAccessToken && Date.now() < tokenExpiry - 30000) return currentAccessToken;
  try { return await requestAccessTokenSilent(); } catch (e) { return await requestAccessTokenInteractive(); }
}

async function driveFetch(path, opts = {}) {
  const token = await getAccessToken();
  const headers = Object.assign({}, opts.headers || {}, { Authorization: 'Bearer ' + token });
  const res = await fetch('https://www.googleapis.com/drive/v3' + path, Object.assign({}, opts, { headers }));
  if (!res.ok) {
    const txt = await res.text().catch(()=>null);
    const err = new Error('Drive API error: ' + res.status + ' ' + txt);
    err.status = res.status;
    err.body = txt;
    throw err;
  }
  return res;
}

async function findFileByName(name) {
  const q = `name='${name.replace(/'/g,"\\'")}'`;
  const res = await driveFetch(`/files?spaces=appDataFolder&q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,size)`);
  const json = await res.json();
  return json.files && json.files[0];
}

async function uploadFileToAppData(name, content, mime='application/octet-stream') {
  const existing = await findFileByName(name);
  const token = await getAccessToken();

  if (existing) {
    const url = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': mime },
      body: content
    });
    if (!res.ok) {
      const txt = await res.text().catch(()=>null);
      throw new Error('Upload failed: ' + res.status + ' ' + txt);
    }
    try { return await res.json(); } catch(e) { return { id: existing.id }; }
  } else {
    const boundary = '-------vault' + Math.random().toString(36).slice(2);
    const metadata = { name, parents: ['appDataFolder'] };
    const parts = [];
    parts.push(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`);
    parts.push(`--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`);
    parts.push(content + '\r\n');
    parts.push(`--${boundary}--`);
    const body = new Blob(parts, { type: 'multipart/related; boundary=' + boundary });

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body
    });
    if (!res.ok) {
      const txt = await res.text().catch(()=>null);
      throw new Error('Upload failed: ' + res.status + ' ' + txt);
    }
    return await res.json();
  }
}

async function downloadFileFromAppData(name) {
  const file = await findFileByName(name);
  if (!file) return null;
  const res = await driveFetch(`/files/${file.id}?alt=media`);
  return await res.text();
}

// Public API
window.gdriveInit = async function(){
  try {
    initTokenClient();
    await requestAccessTokenSilent().catch(()=>null);
    return;
  } catch (e) {
    throw e;
  }
};

window.ensureKeyLoaded = async function(){
  try {
    const key = localStorage.getItem('vault_key_b64');
    if (key) return key;
    await requestAccessTokenInteractive(); // ensure interactive sign-in if needed
    const remote = await downloadFileFromAppData('vault_key.json');
    if (remote) { localStorage.setItem('vault_key_b64', remote); return remote; }
    if (typeof generateAesKeyB64 !== 'function') throw new Error('generateAesKeyB64 mancante');
    const newKey = await generateAesKeyB64();
    await uploadFileToAppData('vault_key.json', newKey, 'application/json');
    localStorage.setItem('vault_key_b64', newKey);
    return newKey;
  } catch (e) {
    throw e;
  }
};

window.saveKeyToDrive = async function(keyB64){
  await requestAccessTokenInteractive();
  return await uploadFileToAppData('vault_key.json', keyB64, 'application/json');
};

window.loadKeyFromDrive = async function(){
  await requestAccessTokenInteractive();
  return await downloadFileFromAppData('vault_key.json');
};

window.saveVaultToDrive = async function(encryptedB64){
  await requestAccessTokenInteractive();
  return await uploadFileToAppData('vault_blob.json', encryptedB64, 'application/octet-stream');
};

window.loadVaultFromDrive = async function(){
  await requestAccessTokenInteractive();
  return await downloadFileFromAppData('vault_blob.json');
};
