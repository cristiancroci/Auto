const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzMgmiNvyJyiacBYqJEp8Nhg5GU7AqEtfN4ilq7aF5EmuKBdMdQsQ6YWy2UmCFqFYzMqA/exec";

let entries = [];
let editIndex = null;
let deleteIndex = null;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

function load() {
  fetch(SCRIPT_URL + "?action=load")
    .then(r => r.text())
    .then(t => {
      try {
        entries = JSON.parse(t || "[]");
      } catch (e) {
        entries = [];
      }
      render();
    })
    .catch(err => console.error("Errore load:", err));
}

function applySort() {
  const mode = document.getElementById("sortSelect").value;

  if (mode === "az") entries.sort((a, b) => a.title.localeCompare(b.title));
  else if (mode === "za") entries.sort((a, b) => b.title.localeCompare(a.title));
  else entries.reverse();

  render();
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

/* ---------------------------
   BANNER DI SICUREZZA
---------------------------- */

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
  document.getElementById("confirmOverlay").remove();
  deleteIndex = null;
}

function doDelete() {
  entries.splice(deleteIndex, 1);
  deleteIndex = null;
  document.getElementById("confirmOverlay").remove();
  render();
}

/* --------------------------- */

function save() {
  const data = encodeURIComponent(JSON.stringify(entries));

  fetch(SCRIPT_URL + "?action=save&data=" + data)
    .then(r => r.text())
    .then(t => {
      try {
        const res = JSON.parse(t);
        if (res.ok) alert("☁️ Salvato su Drive");
      } catch (e) {
        alert("Salvato");
      }
    })
    .catch(err => {
      console.error("Errore save:", err);
      alert("Errore di rete");
    });
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

load();