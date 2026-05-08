/* =========================================
   CONFIG BACKEND APPS SCRIPT
========================================= */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxCVy64NeuTg5z-BkhAc5zCoDqA8AXmCSTqm-l3va8uypY5aSWR6yYhpTUMxQDNa7nW/exec";

/* =========================================
   CIFRATURA AES-GCM
========================================= */
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

/* =========================================
   STATO VAULT
========================================= */
let masterKey = null;
let items = [];

/* =========================================
   SALVATAGGIO LOCALE + DRIVE
========================================= */
function saveLocal() {
    localStorage.setItem("vault-items", JSON.stringify(items));
}

async function saveRemote() {
    if (!masterKey) return;

    const encrypted = await encryptData(masterKey, items);

    await fetch(SCRIPT_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(encrypted)
    });
}

async function loadRemote() {
    const res = await fetch(SCRIPT_URL);
    const text = await res.text();

    if (!text) return;

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.warn("Risposta non valida dal backend", e);
        return;
    }

    // Se il file è vuoto o nel formato iniziale
    if (data.items && Array.isArray(data.items)) {
        items = data.items;
        saveLocal();
        return;
    }

    // formato cifrato
    if (data.iv && data.data) {
        try {
            items = await decryptData(masterKey, data);
            saveLocal();
        } catch (e) {
            console.error("Errore nella decifratura dei dati da Drive", e);
        }
    }
}

async function saveAll() {
    saveLocal();
    await saveRemote();
}

/* =========================================
   UI
========================================= */
function renderItems() {
    const list = document.getElementById("savedList");
    list.innerHTML = "";

    if (!items || items.length === 0) {
        list.innerHTML = "<p>Nessuna voce salvata.</p>";
        return;
    }

    items.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `
            <div class="item-title">${item.title || ""}</div>
            <div class="item-user">${item.username || ""}</div>
        `;
        div.onclick = () => viewItem(index);
        list.appendChild(div);
    });
}

function viewItem(index) {
    const item = items[index];
    if (!item) return;

    document.getElementById("viewTitle").textContent = item.title || "";
    document.getElementById("viewUsername").textContent = item.username || "";
    document.getElementById("viewPassword").textContent = item.password || "";
    document.getElementById("viewPin").textContent = item.pin || "";
    document.getElementById("viewNote").textContent = item.note || "";

    document.getElementById("viewModal").classList.add("open");
}

/* =========================================
   AVVIO
========================================= */
document.addEventListener("DOMContentLoaded", () => {
    const overlay = document.getElementById("masterOverlay");
    const unlockBtn = document.getElementById("unlockBtn");
    const masterInput = document.getElementById("masterInput");

    overlay.style.display = "flex";

    unlockBtn.onclick = async () => {
        const pwd = masterInput.value.trim();
        if (!pwd) return;

        masterKey = await getKeyFromPassword(pwd);

        overlay.style.display = "none";

        // Carica prima da locale
        const local = localStorage.getItem("vault-items");
        if (local) {
            try {
                items = JSON.parse(local);
            } catch {
                items = [];
            }
        }

        renderItems();

        // Poi prova a caricare da Drive
        await loadRemote();
        renderItems();
    };

    const saveBtn = document.getElementById("saveBtn");
    saveBtn.onclick = async () => {
        const title = document.getElementById("title").value.trim();
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();
        const pin = document.getElementById("pin").value.trim();
        const note = document.getElementById("note").value.trim();

        if (!title && !username && !password && !pin && !note) {
            return;
        }

        items.push({ title, username, password, pin, note });
        await saveAll();
        renderItems();

        document.getElementById("title").value = "";
        document.getElementById("username").value = "";
        document.getElementById("password").value = "";
        document.getElementById("pin").value = "";
        document.getElementById("note").value = "";
    };
});