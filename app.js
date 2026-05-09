const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzMgmiNvyJyiacBYqJEp8Nhg5GU7AqEtfN4ilq7aF5EmuKBdMdQsQ6YWy2UmCFqFYzMqA/exec";

let entries = [];
let editIndex = null;
let deleteIndex = null;
let isSaving = false;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

/* ============================
   CARICAMENTO
============================ */

async function load() {
  try {
    const r = await fetch(SCRIPT_URL + "?action=load");
    const t = await r.text();

    if (!t) entries = [];
    else {
      try { entries = JSON.parse(t); }
      catch { entries = []; }
    }

    render();

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
  const status = document.getElementById("saveStatus");

  status.className = "statusIndicator saving";
  status.textContent = "🟡 Salvataggio...";
  isSaving = true;

  try {
    const data = encodeURIComponent(JSON.stringify(entries));
    await fetch(SCRIPT_URL + "?action=save&data=" + data);

    status.className = "statusIndicator ok";
    status.textContent = "🟢 Salvato";
    isSaving = false;

  } catch (err) {
    console.error("Errore save:", err);
    status.className = "statusIndicator err";
    status.textContent = "🔴 Errore";
    isSaving = false;
  }
}

window.addEventListener("beforeunload", function (e) {
  if (isSaving) {
    e.preventDefault();
    e.returnValue = "";
  }
});

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
    document.querySelector(".addBtn").className = "addBtn crazyBtn";
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
   ELIMINAZIONE
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

load();