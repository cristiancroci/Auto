const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxCVy64NeuTg5z-BkhAc5zCoDqA8AXmCSTqm-l3va8uypY5aSWR6yYhpTUMxQDNa7nW/exec";

function notify(msg, type = "info") {
  const box = document.getElementById("notifyBox");
  box.className = "";
  box.classList.add(`notify-${type}`);
  box.textContent = msg;
  box.style.display = "block";
  setTimeout(() => box.style.display = "none", 2000);
}

async function getKeyFromPassword(password) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("vault-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(key, data) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(data)));
  return { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
}

async function decryptData(key, encrypted) {
  const iv = new Uint8Array(encrypted.iv);
  const data = new Uint8Array(encrypted.data);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

let masterKey = null;
let items = [];

function saveLocal() {
  localStorage.setItem("vault-items", JSON.stringify(items));
}

async function saveRemote() {
  try {
    const encrypted = await encryptData(masterKey, items);
    await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(encrypted)
    });
  } catch {
    notify("Errore salvataggio remoto", "error");
  }
}

async function loadRemote() {
  const res = await fetch(SCRIPT_URL);
  const text = await res.text();
  if (!text) return;

  let data;
  try { data = JSON.parse(text); } catch { return; }

  if (data.items) {
    items = data.items;
    saveLocal();
    return;
  }

  if (data.iv && data.data) {
    try {
      items = await decryptData(masterKey, data);
      saveLocal();
    } catch {}
  }
}

function renderItems() {
  const list = document.getElementById("itemsContainer");
  list.innerHTML = "";

  if (!items.length) {
    list.innerHTML = "<p>Nessuna voce salvata.</p>";
    return;
  }

  items.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<div>${item.title}</div><div>${item.username}</div>`;
    div.onclick = () => viewItem(index);
    list.appendChild(div);
  });
}

function viewItem(i) {
  const item = items[i];
  document.getElementById("viewTitle").textContent = item.title;
  document.getElementById("viewUser").textContent = item.username;
  document.getElementById("viewPass").textContent = item.password;
  document.getElementById("viewPin").textContent = item.pin;
  document.getElementById("viewNotes").textContent = item.note;
  document.getElementById("viewOverlay").classList.add("open");
}

document.getElementById("viewClose").onclick = () =>
  document.getElementById("viewOverlay").classList.remove("open");

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("masterOverlay");
  const unlockBtn = document.getElementById("unlockBtn");

  unlockBtn.onclick = async () => {
    const pwd = document.getElementById("masterInput").value.trim();
    if (!pwd) return;

    masterKey = await getKeyFromPassword(pwd);
    overlay.style.display = "none";

    const local = localStorage.getItem("vault-items");
    if (local) items = JSON.parse(local);

    renderItems();
    notify("Caricamento da Drive...", "info");
    await loadRemote();
    renderItems();
    notify("Dati caricati", "success");
  };

  document.getElementById("saveBtn").onclick = async () => {
    const title = document.getElementById("titleInput").value.trim();
    const username = document.getElementById("usernameInput").value.trim();
    const password = document.getElementById("passwordInput").value.trim();
    const pin = document.getElementById("pinInput").value.trim();
    const note = document.getElementById("notesInput").value.trim();

    if (!title && !username && !password && !pin && !note) return;

    items.push({ title, username, password, pin, note });

    notify("Salvataggio...", "info");
    await saveLocal();
    await saveRemote();
    notify("Salvato su Drive", "success");

    renderItems();

    document.getElementById("titleInput").value = "";
    document.getElementById("usernameInput").value = "";
    document.getElementById("passwordInput").value = "";
    document.getElementById("pinInput").value = "";
    document.getElementById("notesInput").value = "";
  };
});