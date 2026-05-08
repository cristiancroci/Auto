/* ============================================================
   CONFIGURAZIONE GOOGLE DRIVE
============================================================ */
const CLIENT_ID = "776375898567-ee2jfmfd9cte7dp6fj02k5ubpvag4e29.apps.googleusercontent.com";
const API_KEY = ""; // non serve per Drive semplice
const SCOPES = "https://www.googleapis.com/auth/drive.file";
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

let googleAuth;
let driveReady = false;
let driveFolderId = null;
const DRIVE_FOLDER_NAME = "VaultSync";
const DRIVE_FILE_NAME = "vault-data.json";

/* ============================================================
   CIFRATURA AES-GCM
============================================================ */
async function getKeyFromPassword(password) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode("vault-salt"),
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function encryptData(key, data) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        enc.encode(JSON.stringify(data))
    );

    return {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted))
    };
}

async function decryptData(key, encrypted) {
    const iv = new Uint8Array(encrypted.iv);
    const data = new Uint8Array(encrypted.data);

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        data
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
}

/* ============================================================
   GOOGLE DRIVE: LOGIN + CARTELLA + FILE
============================================================ */
function initGoogle() {
    return new Promise(resolve => {
        gapi.load("client:auth2", async () => {
            await gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                discoveryDocs: DISCOVERY_DOCS,
                scope: SCOPES
            });

            googleAuth = gapi.auth2.getAuthInstance();
            resolve();
        });
    });
}

async function ensureGoogleLogin() {
    if (!googleAuth.isSignedIn.get()) {
        await googleAuth.signIn(); // popup
    }
    driveReady = true;
}

async function ensureDriveFolder() {
    const res = await gapi.client.drive.files.list({
        q: `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id,name)"
    });

    if (res.result.files.length > 0) {
        driveFolderId = res.result.files[0].id;
        return;
    }

    const create = await gapi.client.drive.files.create({
        resource: {
            name: DRIVE_FOLDER_NAME,
            mimeType: "application/vnd.google-apps.folder"
        },
        fields: "id"
    });

    driveFolderId = create.result.id;
}

async function ensureDriveFile() {
    const res = await gapi.client.drive.files.list({
        q: `'${driveFolderId}' in parents and name='${DRIVE_FILE_NAME}' and trashed=false`,
        fields: "files(id,name)"
    });

    if (res.result.files.length > 0) {
        return res.result.files[0].id;
    }

    const create = await gapi.client.drive.files.create({
        resource: {
            name: DRIVE_FILE_NAME,
            parents: [driveFolderId]
        },
        fields: "id"
    });

    return create.result.id;
}

async function uploadToDrive(jsonString) {
    const fileId = await ensureDriveFile();

    const boundary = "-------314159265358979323846";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelim = "\r\n--" + boundary + "--";

    const contentType = "application/json";

    const metadata = {
        name: DRIVE_FILE_NAME,
        mimeType: contentType
    };

    const multipartRequestBody =
        delimiter +
        "Content-Type: application/json\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        "Content-Type: " + contentType + "\r\n\r\n" +
        jsonString +
        closeDelim;

    await gapi.client.request({
        path: "/upload/drive/v3/files/" + fileId,
        method: "PATCH",
        params: { uploadType: "multipart" },
        headers: { "Content-Type": "multipart/related; boundary=" + boundary },
        body: multipartRequestBody
    });
}

async function downloadFromDrive() {
    const fileId = await ensureDriveFile();

    const res = await gapi.client.drive.files.get({
        fileId,
        alt: "media"
    });

    return res.body;
}

/* ============================================================
   VAULT: SALVATAGGIO LOCALE + DRIVE
============================================================ */
let masterKey = null;
let items = [];

function saveLocal() {
    localStorage.setItem("vault-items", JSON.stringify(items));
}

async function saveAll() {
    saveLocal();

    if (driveReady && masterKey) {
        const encrypted = await encryptData(masterKey, items);
        await uploadToDrive(JSON.stringify(encrypted));
    }
}

async function loadAll() {
    const local = localStorage.getItem("vault-items");
    if (local) {
        items = JSON.parse(local);
    }

    if (driveReady && masterKey) {
        try {
            const raw = await downloadFromDrive();
            if (raw) {
                const encrypted = JSON.parse(raw);
                items = await decryptData(masterKey, encrypted);
                saveLocal();
            }
        } catch (e) {
            console.warn("Nessun file Drive valido.");
        }
    }

    renderItems();
}

/* ============================================================
   UI
============================================================ */
function renderItems() {
    const list = document.getElementById("savedList");
    list.innerHTML = "";

    if (items.length === 0) {
        list.innerHTML = "<p>Nessuna voce salvata.</p>";
        return;
    }

    items.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "item";
        div.innerHTML = `
            <div class="item-title">${item.title}</div>
            <div class="item-user">${item.username}</div>
        `;
        div.onclick = () => viewItem(index);
        list.appendChild(div);
    });
}

/* ============================================================
   AVVIO
============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
    // Mostra overlay master password
    document.getElementById("masterOverlay").style.display = "flex";

    document.getElementById("unlockBtn").onclick = async () => {
        const pwd = document.getElementById("masterInput").value.trim();
        if (!pwd) return;

        masterKey = await getKeyFromPassword(pwd);

        // Nascondi overlay
        document.getElementById("masterOverlay").style.display = "none";

        // Inizializza Google
        await initGoogle();
        await ensureGoogleLogin();
        await ensureDriveFolder();

        // Carica dati
        await loadAll();
    };

    document.getElementById("saveBtn").onclick = async () => {
        const item = {
            title: document.getElementById("title").value,
            username: document.getElementById("username").value,
            password: document.getElementById("password").value,
            pin: document.getElementById("pin").value,
            note: document.getElementById("note").value
        };

        items.push(item);
        await saveAll();
        renderItems();
    };
});