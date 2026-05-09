const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzMgmiNvyJyiacBYqJEp8Nhg5GU7AqEtfN4ilq7aF5EmuKBdMdQsQ6YWy2UmCFqFYzMqA/exec";

let entries = [];
let editIndex = null;
let deleteIndex = null;
let isSaving = false;

/* ============================
   CARICAMENTO
============================ */

async function load() {
  try {
    const r = await fetch(SCRIPT_URL + "?action=load");
    const t = await r.text();
    entries = t ? JSON.parse(t) : [];
  } catch {
    entries = [];
  }
  render();
}

/* ============================
   SALVATAGGIO
============================ */

let saveTimeout = null;

function autoSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(save, 500);
}

async function save() {
  const status = document.getElementById("saveStatus");
  status.className = "statusIndicator saving";
  status.textContent = "🟡 Salvataggio...";
  isSaving = true;

  try {
    const data = encodeURIComponent(JSON.stringify(entries));
    await fetch(SCRIPT_URL + "?action=save&data=" + data);
    status.className = "statusIndicator ok";
    status.textContent = "🟢 Salvato";
  } catch {
    status.className = "statusIndicator err";
    status.textContent = "🔴 Errore";
  }

  isSaving = false;
}

/* ============================
   RENDER
============================ */

function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  entries.forEach((e, i) => {
    const div = document.createElement("div");
    div.className = "entry";

    div.innerHTML = `
      <div class="entryTitle">🔷 ${escapeHtml(e.title)}</div><br>

      <div class="entryRow">👤 <span class="label">Username:</span> ${escapeHtml(e.username)}</div>
      <div class="entryRow">🔑 <span class="label">Password:</span> ${escapeHtml(e.password)}</div>
      <div class="entryRow">📌 <span class="label">PIN:</span> ${escapeHtml(e.pin)}</div>
      <div class="entryRow">🌐 <span class="label">URL:</span> ${escapeHtml(e.url)}</div>
      <div class="entryRow">📝 <span class="label">Note:</span> ${escapeHtml(e.note)}</div>

      <br>

      <button class="btn-edit" onclick="startEdit(${i})">✏️ Modifica</button>
      <button class="btn-delete" onclick="confirmDelete(${i})">🗑️ Elimina</button>
    `;

    list.appendChild(div);
  });
}

/* ============================
   AGGIUNTA / MODIFICA
============================ */

function addEntry() {
  const title = titleInput.value.trim();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const pin = pinInput.value.trim();
  const url = urlInput.value.trim();
  const note = noteInput.value.trim();

  if (!title && !username && !password) return;

  if (editIndex === null) {
    entries.push({ title, username, password, pin, url, note });
  } else {
    entries[editIndex] = { title, username, password, pin, url, note };
    editIndex = null;

    addBtn.innerHTML = "➕ Nuova voce";
    addBtn.className = "btn-crazy";
  }

  clearForm();
  render();
  autoSave();
}

function startEdit(i) {
  const e = entries[i];
  editIndex = i;

  titleInput.value = e.title;
  usernameInput.value = e.username;
  passwordInput.value = e.password;
  pinInput.value = e.pin;
  urlInput.value = e.url;
  noteInput.value = e.note;

  addBtn.innerHTML = "💾 Salva Modifica";
  addBtn.className = "btn-save";
}

function clearForm() {
  titleInput.value = "";
  usernameInput.value = "";
  passwordInput.value = "";
  pinInput.value = "";
  urlInput.value = "";
  noteInput.value = "";
}

/* ============================
   ELIMINAZIONE
============================ */

function confirmDelete(i) {
  deleteIndex = i;

  const overlay = document.createElement("div");
  overlay.className = "confirmOverlay";
  overlay.id = "confirmOverlay";

  overlay.innerHTML = `
    <div class="confirmBox">
      <h3>Eliminare questa voce?</h3>

      <div class="confirmButtons">
        <button class="btn-cancel" onclick="cancelDelete()">❌ Annulla</button>
        <button class="btn-delete" onclick="doDelete()">🗑️ Elimina</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function cancelDelete() {
  document.getElementById("confirmOverlay").remove();
  deleteIndex = null;
}

function doDelete() {
  entries.splice(deleteIndex, 1);
  deleteIndex = null;
  document.getElementById("confirmOverlay").remove();
  render();
  autoSave();
}

/* ============================
   UTILITY
============================ */

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

const titleInput = document.getElementById("title");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const pinInput = document.getElementById("pin");
const urlInput = document.getElementById("url");
const noteInput = document.getElementById("note");
const addBtn = document.getElementById("addBtn");

load();