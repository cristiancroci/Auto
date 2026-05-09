const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzMgmiNvyJyiacBYqJEp8Nhg5GU7AqEtfN4ilq7aF5EmuKBdMdQsQ6YWy2UmCFqFYzMqA/exec";

// 🔐 CHIAVE SEMPLICE (CAMBIALA SE VUOI)
const MASTER_KEY = "mia-chiave-segreta-123";

let entries = [];
let editIndex = null;
let deleteIndex = null;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

/* ============================
   CARICAMENTO + DECIFRATURA
============================ */

async function load() {
  try {
    const r = await fetch(SCRIPT_URL + "?action=load");
    const t = await r.text();

    if (!t) {
      entries = [];
      render();
      return;
    }

    // 1) Proviamo JSON in chiaro (vecchio formato)
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) {
        entries = parsed;
        render();
        autoSave(); // converte subito in cifrato
        return;
      }
    } catch (e) {}

    // 2) Altrimenti è cifrato
    try {
      const jsonStr = await decryptData(MASTER_KEY, t);
      const parsed = JSON.parse(jsonStr);
      entries = parsed;
      render();
    } catch (e) {
      alert("Errore: impossibile decifrare i dati.");
      entries = [];
      render();
    }

  } catch (err) {
    console.error("Errore load:", err);
    entries = [];
    render();
  }
}

/* ============================
   SALVATAGGIO AUTOMATICO
============================ */

let saveTimeout = null;

function autoSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    save();
  }, 500);
}

async function save() {
  try {
    const jsonStr = JSON.stringify(entries);
    const cipherText = await encryptData(MASTER_KEY, jsonStr);
    const data = encodeURIComponent(cipherText);

    await fetch(SCRIPT_URL + "?action=save&data=" + data);

    showToast("☁️ Salvato su Drive", "ok");

  } catch (err) {
    console.error("Errore save:", err);
    showToast("❌ Errore salvataggio", "err");
  }
}

/* ============================
   ORDINAMENTO + RENDER
============================ */

function applySort() {
  const mode = document.getElementById("sortSelect").value;

  if (mode === "az") entries.sort((a, b) => a.title.localeCompare(b.title));
  else if (mode === "za") entries.sort((a, b) => b.title.localeCompare(a.title));
  else entries.reverse();

  render();
  autoSave();
}

function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  entries.forEach((e, i) => {
    const div = document.createElement("div");
    div.className = "entry";
    div.innerHTML = `
      <b>${escapeHtml(e.title)}</b><br>
      👤 ${escapeHtml(e.username)}<br>
      🔑 ${escapeHtml(e.password)}<br>
      📌 ${escapeHtml(e.pin)}<br>
      🌐 ${escapeHtml(e.url)}<br>
      📝 ${escapeHtml(e.note)}<br><br>

      <button class="orangeBtn" onclick="startEdit(${i})">✏️ Modifica</button>
      <button class="redBtn" onclick="confirmDelete(${i})">🗑️ Elimina</button>
    `;
    list.appendChild(div);
  });
}

/* ============================
   GESTIONE VOCI
============================ */

function addEntry() {
  const title = document.getElementById("title").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const pin = document.getElementById("pin").value.trim();
  const url = document.getElementById("url").value.trim();
  const note = document.getElementById("note").value.trim();

  if (!title && !username && !password) return;

  if (editIndex === null) {
    entries.push({ title, username, password, pin, url, note });
  } else {
    entries[editIndex] = { title, username, password, pin, url, note };
    editIndex = null;
    document.querySelector(".addBtn").innerHTML = "➕ Nuova voce";
    document.querySelector(".addBtn").className = "addBtn blueBtn";
  }

  clearForm();
  render();
  autoSave();
}

function startEdit(i) {
  const e = entries[i];
  editIndex = i;

  document.getElementById("title").value = e.title;
  document.getElementById("username").value = e.username;
  document.getElementById("password").value = e.password;
  document.getElementById("pin").value = e.pin;
  document.getElementById("url").value = e.url;
  document.getElementById("note").value = e.note;

  document.querySelector(".addBtn").innerHTML = "💾 Salva Modifica";
  document.querySelector(".addBtn").className = "addBtn greenBtn";
}

function clearForm() {
  document.getElementById("title").value = "";
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("pin").value = "";
  document.getElementById("url").value = "";
  document.getElementById("note").value = "";
}

/* ============================
   BANNER ELIMINAZIONE
============================ */

function confirmDelete(i) {
  deleteIndex = i;

  const overlay = document.createElement("div");
  overlay.className = "confirmOverlay";
  overlay.id = "confirmOverlay";

  overlay.innerHTML = `
    <div class="confirmBox">
      <h3>Sei sicuro di voler eliminare questa voce?</h3>

      <div class="confirmButtons">
        <button class="blueBtn" onclick="cancelDelete()">❌ Annulla</button>
        <button class="redBtn" onclick="doDelete()">🗑️ Elimina</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function cancelDelete() {
  const ov = document.getElementById("confirmOverlay");
  if (ov) ov.remove();
  deleteIndex = null;
}

function doDelete() {
  if (deleteIndex !== null) {
    entries.splice(deleteIndex, 1);
  }
  deleteIndex = null;
  const ov = document.getElementById("confirmOverlay");
  if (ov) ov.remove();
  render();
  autoSave();
}

/* ============================
   CIFRATURA AES-GCM + PBKDF2
============================ */

async function encryptData(password, dataStr) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(password, salt);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(dataStr)
  );

  const full = new Uint8Array(salt.byteLength + iv.byteLength + cipherBuffer.byteLength);
  full.set(salt, 0);
  full.set(iv, salt.byteLength);
  full.set(new Uint8Array(cipherBuffer), salt.byteLength + iv.byteLength);

  return bytesToBase64(full);
}

async function decryptData(password, b64) {
  const full = base64ToBytes(b64);
  const salt = full.slice(0, 16);
  const iv = full.slice(16, 28);
  const data = full.slice(28);

  const key = await deriveKey(password, salt);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  const dec = new TextDecoder();
  return dec.decode(plainBuffer);
}

async function deriveKey(password, salt) {
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
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/* ============================
   NOTIFICHE TOAST
============================ */

function showToast(msg, type = "ok") {
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.innerText = msg;
  document.body.appendChild(t);

  setTimeout(() => t.remove(), 3000);
}

/* ============================
   UTILITY
============================ */

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

/* ============================ */

load();