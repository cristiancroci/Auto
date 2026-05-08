const STORAGE_KEY = "vault-encrypted";
let editingId = null;
let masterKey = null; // derivata dalla master password

const titleInput = document.getElementById("titleInput");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const pinInput = document.getElementById("pinInput");
const notesInput = document.getElementById("notesInput");

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const sortSelect = document.getElementById("sortSelect");
const itemsContainer = document.getElementById("itemsContainer");

const masterOverlay = document.getElementById("masterOverlay");
const masterInput = document.getElementById("masterInput");
const unlockBtn = document.getElementById("unlockBtn");

/* ========== CRITTOGRAFIA SEMPLIFICATA (AES-GCM) ========== */

async function deriveKeyFromPassword(password) {
  const enc = new TextEncoder();
  const salt = enc.encode("vault-static-salt"); // per ora fisso (step dopo si può migliorare)
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(obj) {
  if (!masterKey) return null;
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = enc.encode(JSON.stringify(obj));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    masterKey,
    data
  );
  const buff = new Uint8Array(cipher);
  const full = new Uint8Array(iv.length + buff.length);
  full.set(iv, 0);
  full.set(buff, iv.length);
  return btoa(String.fromCharCode(...full));
}

async function decryptData(str) {
  if (!masterKey) return [];
  try {
    const bin = atob(str);
    const bytes = new Uint8Array([...bin].map(c => c.charCodeAt(0)));
    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      masterKey,
      data
    );
    const dec = new TextDecoder().decode(plain);
    return JSON.parse(dec);
  } catch {
    return [];
  }
}

/* ========== STORAGE ========== */

async function loadItems() {
  const encrypted = localStorage.getItem(STORAGE_KEY);
  if (!encrypted) return [];
  return await decryptData(encrypted);
}

async function saveItems(items) {
  const encrypted = await encryptData(items);
  if (encrypted) {
    localStorage.setItem(STORAGE_KEY, encrypted);
  }
}

/* ========== UI ========== */

function resetForm() {
  editingId = null;
  titleInput.value = "";
  usernameInput.value = "";
  passwordInput.value = "";
  pinInput.value = "";
  notesInput.value = "";
}

function sortItems(items) {
  const mode = sortSelect.value;

  if (mode === "name-asc") return items.sort((a, b) => a.title.localeCompare(b.title));
  if (mode === "name-desc") return items.sort((a, b) => b.title.localeCompare(a.title));
  if (mode === "recent") return items.sort((a, b) => b.id - a.id);
  if (mode === "oldest") return items.sort((a, b) => a.id - b.id);

  return items;
}

async function renderItems() {
  let items = await loadItems();
  items = sortItems(items);

  itemsContainer.innerHTML = "";

  if (!items.length) {
    itemsContainer.innerHTML = "<p style='opacity:0.6;font-size:0.8rem;'>Nessuna voce salvata.</p>";
    return;
  }

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div class="item-title">${item.title}</div>
      <div style="opacity:0.7;font-size:0.8rem;">
        User: ${item.username || "-"} • PIN: ${item.pin ? "••••" : "-"}
      </div>
      <div class="item-actions">
        <button class="btn-small btn-edit">✏️ Modifica</button>
        <button class="btn-small btn-delete">🗑️ Elimina</button>
      </div>
    `;

    div.querySelector(".btn-edit").onclick = () => startEdit(item.id);
    div.querySelector(".btn-delete").onclick = () => deleteItem(item.id);

    itemsContainer.appendChild(div);
  });
}

async function startEdit(id) {
  const items = await loadItems();
  const item = items.find(i => i.id === id);
  if (!item) return;

  editingId = id;

  titleInput.value = item.title;
  usernameInput.value = item.username;
  passwordInput.value = item.password;
  pinInput.value = item.pin;
  notesInput.value = item.notes;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteItem(id) {
  if (!confirm("Eliminare questa voce?")) return;
  let items = await loadItems();
  items = items.filter(i => i.id !== id);
  await saveItems(items);
  await renderItems();
}

/* ========== EVENTI ========== */

saveBtn.onclick = async () => {
  const title = titleInput.value.trim();
  if (!title) {
    alert("Inserisci un titolo");
    return;
  }

  const item = {
    id: editingId || Date.now(),
    title,
    username: usernameInput.value.trim(),
    password: passwordInput.value.trim(),
    pin: pinInput.value.trim(),
    notes: notesInput.value.trim(),
  };

  let items = await loadItems();

  if (editingId) {
    items = items.map(i => (i.id === editingId ? item : i));
  } else {
    items.push(item);
  }

  await saveItems(items);
  resetForm();
  await renderItems();
};

resetBtn.onclick = resetForm;

document.querySelectorAll(".eye").forEach(eye => {
  eye.onclick = () => {
    const target = document.getElementById(eye.dataset.target);
    target.type = target.type === "password" ? "text" : "password";
  };
});

sortSelect.onchange = () => {
  renderItems();
};

/* ========== MASTER PASSWORD FLOW ========== */

unlockBtn.onclick = async () => {
  const pwd = masterInput.value.trim();
  if (!pwd) {
    alert("Inserisci la master password");
    return;
  }

  masterKey = await deriveKeyFromPassword(pwd);
  masterOverlay.style.display = "none";
  await renderItems();
};

/* opzionale: invio con Enter */
masterInput.addEventListener("keydown", e => {
  if (e.key === "Enter") unlockBtn.click();
});