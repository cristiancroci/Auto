// drive-sync.js
// Requisito: <script src="https://apis.google.com/js/api.js"></script> incluso in index.html
const GAPI_CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
const GAPI_SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

async function initGapi() {
  return new Promise(resolve => {
    gapi.load('client:auth2', async () => {
      await gapi.client.init({ clientId: GAPI_CLIENT_ID, scope: GAPI_SCOPES });
      resolve();
    });
  });
}

async function signInDrive() {
  await initGapi();
  const auth = gapi.auth2.getAuthInstance();
  if (!auth.isSignedIn.get()) await auth.signIn();
  await gapi.client.load('drive', 'v3');
  return auth.currentUser.get();
}

async function findVaultFile() {
  const res = await gapi.client.drive.files.list({
    spaces: 'appDataFolder',
    q: "name='vault_blob.json'",
    fields: 'files(id,name,modifiedTime,size)'
  });
  return res.result.files && res.result.files[0];
}

async function saveVaultToDrive(encryptedBlobB64) {
  await signInDrive();
  const existing = await findVaultFile();
  const metadata = { name: 'vault_blob.json', parents: ['appDataFolder'] };
  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const closeDelim = "\r\n--" + boundary + "--";
  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/octet-stream\r\n\r\n' +
    atob(encryptedBlobB64) +
    closeDelim;

  if (existing) {
    const res = await gapi.client.request({
      path: `/upload/drive/v3/files/${existing.id}`,
      method: 'PATCH',
      params: { uploadType: 'multipart' },
      headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
      body: multipartRequestBody
    });
    return res.result;
  } else {
    const res = await gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart' },
      headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
      body: multipartRequestBody
    });
    return res.result;
  }
}

async function loadVaultFromDrive() {
  await signInDrive();
  const file = await findVaultFile();
  if (!file) return null;
  const res = await gapi.client.drive.files.get({ fileId: file.id, alt: 'media' });
  return res.body || res.result;
}
